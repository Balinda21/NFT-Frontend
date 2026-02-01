import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  ImageBackground,
  Image,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { chatService, ChatMessage, ChatSession } from '../services/chatService';
import { uploadImage, uploadAudio } from '../services/cloudinaryService';
import { API_ENDPOINTS } from '../config/api';
import { api } from '../services/apiClient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const formatTime = (dateString: string) => {
  try {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '';
  }
};

const ChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { token, user } = useAuth();
  const routeParams = route.params as { sessionId?: string; userId?: string } | undefined;
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioDurations, setAudioDurations] = useState<Record<string, number>>({});
  const [audioPositions, setAudioPositions] = useState<Record<string, number>>({});
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null); // Use ref to avoid echo/multiple instances
  const isPlayingRef = useRef<boolean>(false); // Prevent multiple simultaneous play attempts
  const waveformAnim = useRef(new Animated.Value(0)).current;
  const recordingWaveformAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const iconAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (messages.length === 0 && !loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(iconAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(iconAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [messages.length, loading]);

  useEffect(() => {
    if (!token) return;

    const initializeChat = async () => {
      try {
        setLoading(true);
        setError(null);
        chatService.connect(token);
        await new Promise(resolve => setTimeout(resolve, 500));

        let chatSession: ChatSession;
        if (user?.role === 'ADMIN' && routeParams?.sessionId) {
          const sessionsResponse = await api.get<ChatSession[]>(API_ENDPOINTS.CHAT.SESSIONS + '/all');
          if (sessionsResponse.success && sessionsResponse.data) {
            const sessions = Array.isArray(sessionsResponse.data) ? sessionsResponse.data : [];
            const foundSession = sessions.find(s => s.id === routeParams.sessionId);
            if (foundSession) {
              chatSession = foundSession;
            } else {
              throw new Error(`Session ${routeParams.sessionId} not found`);
            }
          } else {
            throw new Error('Failed to load sessions');
          }
        } else {
          chatSession = await chatService.getOrCreateSession();
        }

        setSession(chatSession);
        chatService.joinSession(chatSession.id);
        await new Promise(resolve => setTimeout(resolve, 300));

        try {
          const messagesData = await chatService.getMessages(chatSession.id);
          setMessages(messagesData.messages || []);
        } catch {
          setMessages([]);
        }

        try {
          await chatService.markAsRead(chatSession.id);
        } catch {}

        setLoading(false);
      } catch (error: any) {
        setError(error.message || 'Failed to initialize chat');
        setLoading(false);
      }
    };

    initializeChat();
  }, [token, routeParams?.sessionId, user?.role]);

  useEffect(() => {
    if (!session?.id) return;

    const unsubscribeNewMessage = chatService.onNewMessage((data) => {
      if (data.sessionId === session.id) {
        setMessages((prev) => {
          const filtered = prev.filter((m) => !m.id.startsWith('temp-'));
          if (filtered.some((m) => m.id === data.message.id)) return filtered;
          return [...filtered, data.message];
        });
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      }
    });

    const unsubscribeTyping = chatService.onTyping((data) => {
      if (data.sessionId === session.id && data.userId !== user?.id) {
        setOtherUserTyping(data.isTyping);
      }
    });

    return () => {
      unsubscribeNewMessage();
      unsubscribeTyping();
    };
  }, [session?.id, user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (!token || !session?.id) return;

      const reloadMessages = async () => {
        try {
          if (!chatService.connected) {
            chatService.connect(token);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          chatService.joinSession(session.id);
          await new Promise(resolve => setTimeout(resolve, 300));

          try {
            const messagesData = await chatService.getMessages(session.id);
            setMessages(messagesData.messages || []);
          } catch {}

          try {
            await chatService.markAsRead(session.id);
          } catch {}
        } catch {}
      };

      reloadMessages();
    }, [token, session?.id])
  );

  useEffect(() => {
    if (!session?.id) return;

    if (message.length > 0 && !isTyping) {
      setIsTyping(true);
      chatService.sendTyping(session.id, true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping && session?.id) {
        setIsTyping(false);
        chatService.sendTyping(session.id, false);
      }
    }, 1000);

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [message, session?.id, isTyping]);

  const handleSend = async () => {
    if ((!message.trim() && !selectedImage && !recordingUri && !recording) || !session || sending) return;

    const messageText = message.trim();
    const imageToSend = selectedImage;
    const localAudioUri = recordingUri;
    const recordingToSend = recording;

    setMessage('');
    setSelectedImage(null);
    setSending(true);

    const audioDuration = recordingDuration;

    try {
      let imageUrl: string | undefined;
      let tempAudioUrl: string | undefined;
      let finalAudioUrl: string | undefined;

      if (imageToSend) {
        setUploadingImage(true);
        try {
          imageUrl = (await uploadImage(imageToSend)).url;
        } catch (uploadError: any) {
          Alert.alert('Upload Error', uploadError.message || 'Failed to upload image');
          setSending(false);
          setUploadingImage(false);
          setSelectedImage(imageToSend);
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      if (localAudioUri || recordingToSend) {
        let uri = localAudioUri;
        if (recordingToSend && !localAudioUri) {
          try {
            uri = recordingToSend.getURI();
            if (uri) await recordingToSend.stopAndUnloadAsync();
          } catch {}
        }
        if (uri) tempAudioUrl = uri;
        setRecording(null);
        setRecordingUri(null);
        setRecordingDuration(0);
      }

      const senderType = user?.role === 'ADMIN' ? 'ADMIN' : 'USER';
      const tempMessageId = `temp-${Date.now()}`;

      if (audioDuration > 0 && tempAudioUrl) {
        setAudioDurations((prev) => ({ ...prev, [tempMessageId]: audioDuration }));
      }

      const optimisticMessage: ChatMessage = {
        id: tempMessageId,
        sessionId: session.id,
        userId: user?.id || '',
        senderType,
        message: messageText,
        imageUrl: imageUrl || null,
        audioUrl: tempAudioUrl || null,
        isRead: false,
        createdAt: new Date().toISOString(),
        user: user ? {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          imageUrl: user.imageUrl,
          role: user.role || 'CUSTOMER',
        } : undefined,
      };

      if (messageText || imageUrl || tempAudioUrl) {
        setMessages((prev) => [...prev, optimisticMessage]);
      }

      if (tempAudioUrl && !finalAudioUrl) {
        setUploadingAudio(tempAudioUrl);
        try {
          const uploadResult = await uploadAudio(tempAudioUrl);
          finalAudioUrl = uploadResult.url;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempMessageId ? { ...msg, audioUrl: finalAudioUrl } : msg
            )
          );
          if (chatService.connected) {
            chatService.sendMessageSocket(session.id, messageText || '', imageUrl, finalAudioUrl);
          } else {
            await chatService.sendMessage(session.id, messageText || '', imageUrl, finalAudioUrl);
          }
          setUploadingAudio(null);
        } catch (uploadError: any) {
          setUploadingAudio(null);
          setMessages((prev) => prev.filter((msg) => msg.id !== tempMessageId));
          Alert.alert('Upload Error', uploadError.message || 'Failed to upload voice note');
          setSending(false);
          return;
        }
      } else {
        if (chatService.connected) {
          chatService.sendMessageSocket(session.id, messageText || '', imageUrl, finalAudioUrl);
        } else {
          await chatService.sendMessage(session.id, messageText || '', imageUrl, finalAudioUrl);
        }
      }

      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      await chatService.markAsRead(session.id);
    } catch (error: any) {
      setMessage(messageText);
      if (imageToSend) setSelectedImage(imageToSend);
      if (localAudioUri) {
        setRecordingUri(localAudioUri);
        setRecordingDuration(audioDuration);
      }
    } finally {
      setSending(false);
      setUploadingAudio(null);
    }
  };

  const handleSendSuggestion = async (suggestionText: string) => {
    if (!session || sending) return;
    setSending(true);
    const senderType = user?.role === 'ADMIN' ? 'ADMIN' : 'USER';
    const tempMessageId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempMessageId,
      sessionId: session.id,
      userId: user?.id || '',
      senderType,
      message: suggestionText,
      imageUrl: null,
      audioUrl: null,
      isRead: false,
      createdAt: new Date().toISOString(),
      user: user ? {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        imageUrl: user.imageUrl,
        role: user.role || 'CUSTOMER',
      } : undefined,
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    if (chatService.connected) {
      chatService.sendMessageSocket(session.id, suggestionText, undefined, undefined);
    } else {
      await chatService.sendMessage(session.id, suggestionText, undefined, undefined);
    }
    setSending(false);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to send images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera permissions.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Failed to take photo.');
    }
  };

  const handleEmojiPress = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant microphone permissions.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      Animated.loop(
        Animated.sequence([
          Animated.timing(recordingWaveformAnim, { toValue: 1, duration: 600, useNativeDriver: false }),
          Animated.timing(recordingWaveformAnim, { toValue: 0, duration: 600, useNativeDriver: false }),
        ])
      ).start();

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch {
      Alert.alert('Error', 'Failed to start recording.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      recordingWaveformAnim.stopAnimation();
      recordingWaveformAnim.setValue(0);

      const status = await recording.getStatusAsync();
      const uri = recording.getURI();
      await recording.stopAndUnloadAsync();
      setIsRecording(false);

      if (uri) {
        setRecordingUri(uri);
        const duration = status.durationMillis ? Math.floor(status.durationMillis / 1000) : recordingDuration;
        setRecordingDuration(duration);
      }
    } catch {
      setIsRecording(false);
      setRecording(null);
      setRecordingUri(null);
      setRecordingDuration(0);
    }
  };

  const cancelRecording = async () => {
    if (!recording) return;
    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      recordingWaveformAnim.stopAnimation();
      recordingWaveformAnim.setValue(0);
      await recording.stopAndUnloadAsync();
      setIsRecording(false);
      setRecording(null);
      setRecordingUri(null);
      setRecordingDuration(0);
    } catch {
      setIsRecording(false);
      setRecording(null);
      setRecordingUri(null);
      setRecordingDuration(0);
    }
  };

  const stopCurrentAudio = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (e) {
        // Ignore errors when stopping
      }
      soundRef.current = null;
    }
    isPlayingRef.current = false;
    waveformAnim.stopAnimation();
    waveformAnim.setValue(0);
  };

  const playAudio = async (audioUrl: string) => {
    // Prevent multiple simultaneous play attempts
    if (isPlayingRef.current) {
      return;
    }

    try {
      // Stop any current sound first
      await stopCurrentAudio();

      // Toggle off if same audio was playing
      if (playingAudio === audioUrl) {
        setPlayingAudio(null);
        setAudioPositions((prev) => ({ ...prev, [audioUrl]: 0 }));
        return;
      }

      isPlayingRef.current = true;

      // Set audio mode for playback (important for iOS)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Create and play sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true, progressUpdateIntervalMillis: 200 }
      );

      soundRef.current = newSound;
      setPlayingAudio(audioUrl);
      setAudioPositions((prev) => ({ ...prev, [audioUrl]: 0 }));

      // Start waveform animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveformAnim, { toValue: 1, duration: 500, useNativeDriver: false }),
          Animated.timing(waveformAnim, { toValue: 0, duration: 500, useNativeDriver: false }),
        ])
      ).start();

      // Set up playback status updates
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          // Update duration if not set
          if (status.durationMillis) {
            setAudioDurations((prev) => {
              if (prev[audioUrl]) return prev;
              return { ...prev, [audioUrl]: Math.floor(status.durationMillis! / 1000) };
            });
          }

          // Update current position
          if (status.positionMillis !== undefined) {
            setAudioPositions((prev) => ({ ...prev, [audioUrl]: Math.floor(status.positionMillis / 1000) }));
          }

          // Handle playback finished
          if (status.didJustFinish) {
            soundRef.current = null;
            isPlayingRef.current = false;
            setPlayingAudio(null);
            setAudioPositions((prev) => ({ ...prev, [audioUrl]: 0 }));
            waveformAnim.stopAnimation();
            waveformAnim.setValue(0);
          }
        }
      });
    } catch (error) {
      console.warn('Audio playback error:', error);
      await stopCurrentAudio();
      setPlayingAudio(null);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (recording) recording.stopAndUnloadAsync();
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => {});
        soundRef.current.unloadAsync().catch(() => {});
      }
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  const commonEmojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'];

  const handleBack = () => navigation.goBack();

  const isUserMessage = (msg: ChatMessage) => {
    if (user?.role === 'ADMIN') return msg.senderType === 'ADMIN';
    return msg.senderType === 'USER' && msg.userId === user?.id;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !session) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.danger} />
          <Text style={styles.errorTitle}>Unable to Load Chat</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setError(null); setLoading(true); }}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              {user?.role === 'ADMIN' && session?.user
                ? `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim() || session.user.email
                : 'Support Chat'}
            </Text>
            {otherUserTyping && <Text style={styles.typingIndicator}>typing...</Text>}
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Messages */}
        <ImageBackground
          source={{ uri: 'https://i.pinimg.com/originals/97/c0/07/97c00759d90d786d9b6096e6e0e2e69b.jpg' }}
          style={styles.messagesArea}
          imageStyle={{ opacity: 0.15 }}
          resizeMode="cover"
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 && (
              <View style={styles.emptyState}>
                <Animated.View style={[styles.emptyIcon, { transform: [{ scale: iconAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }] }]}>
                  <Ionicons name="chatbubbles" size={60} color={colors.accent} />
                </Animated.View>
                <Text style={styles.emptyTitle}>Start a Conversation</Text>
                <Text style={styles.emptySubtitle}>We're here to help you</Text>
                <View style={styles.suggestions}>
                  {['Hello! I need help', 'What are your trading fees?', 'How do I deposit funds?'].map((text, i) => (
                    <TouchableOpacity key={i} style={styles.suggestionChip} onPress={() => handleSendSuggestion(text)} activeOpacity={0.7}>
                      <Text style={styles.suggestionText}>{text}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {messages.map((msg) => {
              const isUser = isUserMessage(msg);
              const isSending = msg.id.startsWith('temp-');
              const isRead = msg.isRead;

              return (
                <View key={msg.id} style={isUser ? styles.sentRow : styles.receivedRow}>
                  <View style={isUser ? styles.sentBubble : styles.receivedBubble}>
                    {/* Image */}
                    {msg.imageUrl && (
                      <TouchableOpacity onPress={() => setViewingImage(msg.imageUrl)} activeOpacity={0.9}>
                        <Image source={{ uri: msg.imageUrl }} style={styles.msgImage} resizeMode="cover" />
                      </TouchableOpacity>
                    )}

                    {/* Voice Note */}
                    {msg.audioUrl && (
                      <View style={styles.voiceNote}>
                        <TouchableOpacity style={styles.playBtn} onPress={() => playAudio(msg.audioUrl!)} activeOpacity={0.8}>
                          <Ionicons name={playingAudio === msg.audioUrl ? 'pause' : 'play'} size={22} color="#FFFFFF" />
                        </TouchableOpacity>
                        <View style={styles.waveformContainer}>
                          {[5, 12, 8, 18, 10, 15, 7, 20, 12, 16, 9, 14, 6, 18, 11, 15, 8, 12].map((h, i) => (
                            <Animated.View
                              key={i}
                              style={[
                                styles.waveBar,
                                isUser ? styles.waveBarSent : styles.waveBarRecv,
                                { height: playingAudio === msg.audioUrl ? waveformAnim.interpolate({ inputRange: [0, 1], outputRange: [h, h + 5] }) : h },
                              ]}
                            />
                          ))}
                        </View>
                        <Text style={isUser ? styles.durationSent : styles.durationRecv}>
                          {playingAudio === msg.audioUrl
                            ? `${formatDuration(audioPositions[msg.audioUrl] || 0)} / ${formatDuration(audioDurations[msg.audioUrl] || 0)}`
                            : formatDuration(audioDurations[msg.audioUrl] || 0)}
                        </Text>
                        {uploadingAudio === msg.audioUrl && <ActivityIndicator size="small" color="#8696A0" />}
                      </View>
                    )}

                    {/* Text */}
                    {msg.message && <Text style={isUser ? styles.sentText : styles.receivedText}>{msg.message}</Text>}

                    {/* Time & Ticks */}
                    <View style={styles.msgMeta}>
                      <Text style={isUser ? styles.timeSent : styles.timeRecv}>{formatTime(msg.createdAt)}</Text>
                      {isUser && (
                        <View style={styles.ticks}>
                          {isSending ? (
                            <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.6)" />
                          ) : isRead ? (
                            <Ionicons name="checkmark-done" size={16} color="#53BDEB" />
                          ) : (
                            <Ionicons name="checkmark-done" size={16} color="rgba(255,255,255,0.6)" />
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}

            {otherUserTyping && (
              <View style={styles.receivedRow}>
                <View style={styles.typingBubble}>
                  <View style={styles.typingDots}>
                    <View style={[styles.dot, { opacity: 0.4 }]} />
                    <View style={[styles.dot, { opacity: 0.6 }]} />
                    <View style={[styles.dot, { opacity: 0.8 }]} />
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </ImageBackground>

        {/* Image Preview */}
        {selectedImage && (
          <View style={styles.imagePreview}>
            <Image source={{ uri: selectedImage }} style={styles.previewImg} resizeMode="cover" />
            <TouchableOpacity style={styles.removeImgBtn} onPress={() => setSelectedImage(null)}>
              <Ionicons name="close-circle" size={28} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        )}

        {/* Recording UI */}
        {isRecording && (
          <View style={styles.recordingBar}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingTime}>{formatDuration(recordingDuration)}</Text>
            <View style={styles.recordingWaveform}>
              {[8, 14, 10, 18, 12, 16, 8, 20, 14, 18].map((h, i) => (
                <Animated.View
                  key={i}
                  style={[styles.recWaveBar, { height: recordingWaveformAnim.interpolate({ inputRange: [0, 1], outputRange: [h, h + 6] }) }]}
                />
              ))}
            </View>
            <TouchableOpacity onPress={cancelRecording} style={styles.cancelRecBtn}>
              <Ionicons name="close" size={24} color="#FF3B30" />
            </TouchableOpacity>
            <TouchableOpacity onPress={stopRecording} style={styles.stopRecBtn}>
              <Ionicons name="checkmark" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Voice Preview */}
        {recordingUri && !isRecording && (
          <View style={styles.voicePreviewBar}>
            <TouchableOpacity style={styles.previewPlayBtn} onPress={() => playAudio(recordingUri)} activeOpacity={0.8}>
              <Ionicons name={playingAudio === recordingUri ? 'pause' : 'play'} size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.previewDuration}>{formatDuration(recordingDuration)}</Text>
            <TouchableOpacity onPress={cancelRecording} style={styles.cancelPreviewBtn}>
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendVoiceBtn, sending && { opacity: 0.5 }]}
              onPress={handleSend}
              disabled={sending}
            >
              {sending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="send" size={20} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
        )}

        {/* Input Area */}
        {!isRecording && !recordingUri && (
          <View style={styles.inputBar}>
            <TouchableOpacity
              style={styles.inputIconBtn}
              onPress={() => Alert.alert('Select Image', 'Choose an option', [
                { text: 'Camera', onPress: handleTakePhoto },
                { text: 'Gallery', onPress: handlePickImage },
                { text: 'Cancel', style: 'cancel' },
              ])}
            >
              <Ionicons name="camera-outline" size={24} color="#8696A0" />
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Message..."
              placeholderTextColor="#8696A0"
              multiline
              maxLength={5000}
              editable={!sending}
            />
            {message.trim() || selectedImage ? (
              <TouchableOpacity
                style={[styles.sendBtn, (sending || uploadingImage) && { opacity: 0.5 }]}
                onPress={handleSend}
                disabled={sending || uploadingImage}
              >
                {sending || uploadingImage ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.micBtn} onPress={startRecording}>
                <Ionicons name="mic" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Image Viewer Modal */}
        <Modal visible={!!viewingImage} transparent animationType="fade" onRequestClose={() => setViewingImage(null)}>
          <View style={styles.imageViewerModal}>
            <TouchableOpacity style={styles.closeImageBtn} onPress={() => setViewingImage(null)}>
              <Ionicons name="close" size={32} color="#FFFFFF" />
            </TouchableOpacity>
            {viewingImage && (
              <Image source={{ uri: viewingImage }} style={styles.fullImage} resizeMode="contain" />
            )}
          </View>
        </Modal>

        {/* Emoji Picker Modal */}
        <Modal visible={showEmojiPicker} transparent animationType="slide" onRequestClose={() => setShowEmojiPicker(false)}>
          <View style={styles.emojiModal}>
            <View style={styles.emojiHeader}>
              <Text style={styles.emojiTitle}>Select Emoji</Text>
              <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.emojiScroll}>
              <View style={styles.emojiGrid}>
                {commonEmojis.map((emoji, i) => (
                  <TouchableOpacity key={i} style={styles.emojiBtn} onPress={() => handleEmojiPress(emoji)}>
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B141A' },
  flex1: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#8696A0', fontSize: 14 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorTitle: { fontSize: 20, fontWeight: '600', color: '#FFFFFF', marginTop: 16 },
  errorText: { fontSize: 14, color: '#8696A0', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  retryBtn: { backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12, backgroundColor: '#1F2C34', borderBottomWidth: 1, borderBottomColor: '#2A3942' },
  backBtn: { padding: 8 },
  headerInfo: { flex: 1, marginLeft: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  typingIndicator: { fontSize: 12, color: '#00A884', marginTop: 2 },

  // Messages
  messagesArea: { flex: 1, backgroundColor: '#0B141A' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 8, paddingBottom: 16 },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0, 168, 132, 0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#8696A0', marginBottom: 24 },
  suggestions: { gap: 10 },
  suggestionChip: { backgroundColor: '#1F2C34', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: '#00A884' },
  suggestionText: { color: '#00A884', fontSize: 14, fontWeight: '500' },

  // Message Rows
  sentRow: { flexDirection: 'row', justifyContent: 'flex-end', marginVertical: 2, paddingHorizontal: 8 },
  receivedRow: { flexDirection: 'row', justifyContent: 'flex-start', marginVertical: 2, paddingHorizontal: 8 },

  // Bubbles
  sentBubble: { backgroundColor: '#005C4B', borderRadius: 12, borderTopRightRadius: 4, padding: 8, maxWidth: '80%', minWidth: 80 },
  receivedBubble: { backgroundColor: '#1F2C34', borderRadius: 12, borderTopLeftRadius: 4, padding: 8, maxWidth: '80%', minWidth: 80 },

  // Text
  sentText: { color: '#FFFFFF', fontSize: 15, lineHeight: 20 },
  receivedText: { color: '#FFFFFF', fontSize: 15, lineHeight: 20 },

  // Meta (time + ticks)
  msgMeta: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4, gap: 4 },
  timeSent: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  timeRecv: { fontSize: 11, color: '#8696A0' },
  ticks: { marginLeft: 2 },

  // Image in message
  msgImage: { width: 220, height: 220, borderRadius: 8, marginBottom: 4 },

  // Voice Note
  voiceNote: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 8, minWidth: 200 },
  playBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#00A884', alignItems: 'center', justifyContent: 'center' },
  waveformContainer: { flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1 },
  waveBar: { width: 3, borderRadius: 2 },
  waveBarSent: { backgroundColor: 'rgba(255,255,255,0.5)' },
  waveBarRecv: { backgroundColor: '#8696A0' },
  durationSent: { fontSize: 12, color: 'rgba(255,255,255,0.6)', minWidth: 36 },
  durationRecv: { fontSize: 12, color: '#8696A0', minWidth: 36 },

  // Typing
  typingBubble: { backgroundColor: '#1F2C34', borderRadius: 12, padding: 12 },
  typingDots: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#8696A0' },

  // Image Preview
  imagePreview: { backgroundColor: '#1F2C34', padding: 12, borderTopWidth: 1, borderTopColor: '#2A3942' },
  previewImg: { width: 150, height: 150, borderRadius: 12 },
  removeImgBtn: { position: 'absolute', top: 8, right: 8 },

  // Recording Bar
  recordingBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1F2C34', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  recordingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF3B30' },
  recordingTime: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', minWidth: 50 },
  recordingWaveform: { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  recWaveBar: { width: 3, backgroundColor: '#00A884', borderRadius: 2 },
  cancelRecBtn: { padding: 8 },
  stopRecBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#00A884', alignItems: 'center', justifyContent: 'center' },

  // Voice Preview Bar
  voicePreviewBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1F2C34', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  previewPlayBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#00A884', alignItems: 'center', justifyContent: 'center' },
  previewDuration: { fontSize: 14, color: '#FFFFFF', flex: 1 },
  cancelPreviewBtn: { padding: 8 },
  sendVoiceBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#00A884', alignItems: 'center', justifyContent: 'center' },

  // Input Bar
  inputBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1F2C34', paddingHorizontal: 8, paddingVertical: 8, gap: 8 },
  inputIconBtn: { padding: 8 },
  textInput: { flex: 1, backgroundColor: '#2A3942', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, color: '#FFFFFF', maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#00A884', alignItems: 'center', justifyContent: 'center' },
  micBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#00A884', alignItems: 'center', justifyContent: 'center' },

  // Image Viewer Modal
  imageViewerModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  closeImageBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 },
  fullImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.8 },

  // Emoji Modal
  emojiModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  emojiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#1F2C34', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  emojiTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  emojiScroll: { backgroundColor: '#1F2C34', maxHeight: 300 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16 },
  emojiBtn: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  emojiText: { fontSize: 28 },
});

export default ChatScreen;
