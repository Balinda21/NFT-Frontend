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
// Simple date formatting without date-fns
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
  const [recordingUri, setRecordingUri] = useState<string | null>(null); // Store local URI for immediate display
  const [uploadingAudio, setUploadingAudio] = useState<string | null>(null); // Track which message is uploading
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [audioDurations, setAudioDurations] = useState<Record<string, number>>({}); // Store durations for each audio
  const waveformAnim = useRef(new Animated.Value(0)).current; // Animation for waveform
  const recordingWaveformAnim = useRef(new Animated.Value(0)).current; // Animation for recording waveform
  const scrollViewRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Animation values for empty state
  const iconAnim = useRef(new Animated.Value(0)).current;

  // Animate empty state
  useEffect(() => {
    if (messages.length === 0 && !loading) {
      // Start icon animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(iconAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(iconAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [messages.length, loading]);

  // Initialize chat session and socket
  useEffect(() => {
    if (!token) {
      console.log('No token available');
      return;
    }

    const initializeChat = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Connect socket
        chatService.connect(token);

        // Wait a bit for socket to connect
        await new Promise(resolve => setTimeout(resolve, 500));

        let chatSession: ChatSession;

        // If admin and sessionId provided, use that session
        if (user?.role === 'ADMIN' && routeParams?.sessionId) {
          // For admin, get all sessions and find the one we need
          try {
            const sessionsResponse = await api.get<ChatSession[]>(API_ENDPOINTS.CHAT.SESSIONS + '/all');
            if (sessionsResponse.success && sessionsResponse.data) {
              const sessions = Array.isArray(sessionsResponse.data) ? sessionsResponse.data : [];
              const foundSession = sessions.find(s => s.id === routeParams.sessionId);
              if (foundSession) {
                chatSession = foundSession;
              } else {
                throw new Error(`Session ${routeParams.sessionId} not found in sessions list`);
              }
            } else {
              throw new Error('Failed to load sessions from backend');
            }
          } catch (err: any) {
            console.error('Error loading admin session:', err);
            throw new Error(err.message || 'Failed to load chat session');
          }
        } else {
          // For regular users, get or create session
          chatSession = await chatService.getOrCreateSession();
        }

        setSession(chatSession);

        // Join session room
        chatService.joinSession(chatSession.id);

        // Wait a bit for join to complete
        await new Promise(resolve => setTimeout(resolve, 300));

        // Load messages (gracefully handle if endpoint doesn't exist)
        try {
          const messagesData = await chatService.getMessages(chatSession.id);
          setMessages(messagesData.messages || []);
        } catch (error: any) {
          // If messages endpoint fails, start with empty array
          // Messages will be received via socket events
          console.warn('Could not load initial messages, will rely on socket events:', error.message);
          setMessages([]);
        }

        // Mark messages as read (gracefully handle if endpoint doesn't exist)
        try {
          await chatService.markAsRead(chatSession.id);
        } catch (error: any) {
          console.warn('Could not mark messages as read:', error.message);
        }

        setLoading(false);
      } catch (error: any) {
        console.error('Error initializing chat:', error);
        // Better error message handling
        let errorMessage = 'Failed to initialize chat. Please try again.';
        if (error?.message) {
          errorMessage = error.message;
        } else if (error?.status === 404) {
          errorMessage = 'Chat endpoint not found. Please check backend configuration.';
        } else if (error?.status === 401) {
          errorMessage = 'Authentication failed. Please login again.';
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
        setError(errorMessage);
        setLoading(false);
      }
    };

    initializeChat();

    return () => {
      // Cleanup on unmount
    };
  }, [token, routeParams?.sessionId, user?.role]);

  // Set up socket listeners after session is created
  useEffect(() => {
    if (!session?.id) return;

    const unsubscribeNewMessage = chatService.onNewMessage((data) => {
      if (data.sessionId === session.id) {
        setMessages((prev) => {
          // Remove optimistic message if exists and replace with real one
          const filtered = prev.filter((m) => !m.id.startsWith('temp-'));
          
          // Avoid duplicates
          if (filtered.some((m) => m.id === data.message.id)) {
            return filtered;
          }
          
          return [...filtered, data.message];
        });
        
        // Auto-scroll to bottom
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
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

  // Reload messages when screen comes into focus (to catch any missed messages)
  useFocusEffect(
    useCallback(() => {
      if (!token || !session?.id) return;

      const reloadMessages = async () => {
        try {
          // Ensure socket is connected
          if (!chatService.connected) {
            chatService.connect(token);
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          // Join session room
          chatService.joinSession(session.id);
          await new Promise(resolve => setTimeout(resolve, 300));

          // Load messages (gracefully handle if endpoint doesn't exist)
          try {
            const messagesData = await chatService.getMessages(session.id);
            setMessages(messagesData.messages || []);
          } catch (error: any) {
            // If messages endpoint fails, keep existing messages
            // New messages will be received via socket events
            console.warn('Could not reload messages, keeping existing messages:', error.message);
          }
          
          // Mark messages as read (gracefully handle if endpoint doesn't exist)
          try {
            await chatService.markAsRead(session.id);
          } catch (error: any) {
            console.warn('Could not mark messages as read:', error.message);
          }
        } catch (error: any) {
          console.error('Error reloading messages on focus:', error);
        }
      };

      reloadMessages();
    }, [token, session?.id])
  );

  // Handle typing indicator
  useEffect(() => {
    if (!session?.id) return;

    if (message.length > 0 && !isTyping) {
      setIsTyping(true);
      chatService.sendTyping(session.id, true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping && session?.id) {
        setIsTyping(false);
        chatService.sendTyping(session.id, false);
      }
    }, 1000);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, session?.id, isTyping]);

  const handleSend = async () => {
    if ((!message.trim() && !selectedImage && !recordingUri && !recording) || !session || sending) return;

    const messageText = message.trim();
    const imageToSend = selectedImage;
    const localAudioUri = recordingUri; // Use stored URI
    const recordingToSend = recording;
    
    // Clear input immediately
    setMessage('');
    setSelectedImage(null);
    setSending(true);

    // Store duration if we have recording
    const audioDuration = recordingDuration;

    try {
      let imageUrl: string | undefined;
      let tempAudioUrl: string | undefined; // Temporary local URI for immediate display
      let finalAudioUrl: string | undefined; // Final Cloudinary URL
      
      // Upload image if selected
      if (imageToSend) {
        setUploadingImage(true);
        try {
          imageUrl = (await uploadImage(imageToSend)).url;
        } catch (uploadError: any) {
          console.error('Error uploading image:', uploadError);
          let errorMessage = uploadError.message || 'Failed to upload image. Please try again.';
          
          if (errorMessage.includes('whitelisted') || errorMessage.includes('unsigned') || errorMessage.includes('preset')) {
            errorMessage = 'Cloudinary upload preset must be set to "Unsigned" mode. Please check CLOUDINARY_FIX.md for instructions.';
          }
          
          Alert.alert('Upload Error', errorMessage);
          setSending(false);
          setUploadingImage(false);
          setSelectedImage(imageToSend);
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      // Handle voice note - show immediately, upload in background
      if (localAudioUri || recordingToSend) {
        let uri = localAudioUri;
        
        // Stop recording if still active
        if (recordingToSend && !localAudioUri) {
          try {
            uri = recordingToSend.getURI();
            if (uri) {
              await recordingToSend.stopAndUnloadAsync();
            }
          } catch (err) {
            console.error('Error getting recording URI:', err);
          }
        }

        if (uri) {
          // Store local URI for immediate display (WhatsApp style)
          tempAudioUrl = uri;
          
          // Store duration - will be used when creating the message
          // Duration will be stored with the message ID after message is created
        }

        // Clean up recording state
        setRecording(null);
        setRecordingUri(null);
        setRecordingDuration(0);
      }

      // Create optimistic message (will be updated with final audio URL after upload)
      const senderType = user?.role === 'ADMIN' ? 'ADMIN' : 'USER';
      const tempMessageId = `temp-${Date.now()}`;
      
      // Store duration for this message
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
        audioUrl: tempAudioUrl || null, // Use local URI for immediate display
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

      // Add message immediately to chat (optimistic UI) - only if we have something to show
      if (messageText || imageUrl || tempAudioUrl) {
        setMessages((prev) => [...prev, optimisticMessage]);
      }

      // Send via socket/API - wait for audio upload if needed
      if (tempAudioUrl && !finalAudioUrl) {
        // If we have a local audio URI, we need to upload it first before sending
        // Show uploading state
        setUploadingAudio(tempAudioUrl);
        
        try {
          // Upload audio first
          const uploadResult = await uploadAudio(tempAudioUrl);
          finalAudioUrl = uploadResult.url;
          
          // Update message with final URL
          setMessages((prev) => 
            prev.map((msg) => 
              msg.id === tempMessageId 
                ? { ...msg, audioUrl: finalAudioUrl }
                : msg
            )
          );
          
          // Now send via socket/API with the Cloudinary URL
          if (chatService.connected) {
            chatService.sendMessageSocket(session.id, messageText || '', imageUrl, finalAudioUrl);
          } else {
            await chatService.sendMessage(session.id, messageText || '', imageUrl, finalAudioUrl);
          }
          
          setUploadingAudio(null);
        } catch (uploadError: any) {
          console.error('Error uploading audio:', uploadError);
          setUploadingAudio(null);
          
          // Remove the optimistic message if upload fails
          setMessages((prev) => prev.filter((msg) => msg.id !== tempMessageId));
          
          let errorMessage = uploadError.message || 'Failed to upload voice note. Please try again.';
          if (errorMessage.includes('whitelisted') || errorMessage.includes('unsigned') || errorMessage.includes('preset')) {
            errorMessage = 'Cloudinary upload preset must be set to "Unsigned" mode. Please check CLOUDINARY_FIX.md for instructions.';
          }
          
          Alert.alert('Upload Error', errorMessage);
          setSending(false);
          return;
        }
      } else {
        // No audio or already uploaded - send immediately
        if (chatService.connected) {
          chatService.sendMessageSocket(session.id, messageText || '', imageUrl, finalAudioUrl);
        } else {
          await chatService.sendMessage(session.id, messageText || '', imageUrl, finalAudioUrl);
        }
      }

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Mark as read
      await chatService.markAsRead(session.id);
    } catch (error: any) {
      console.error('Error sending message:', error);
      setMessage(messageText);
      if (imageToSend) {
        setSelectedImage(imageToSend);
      }
      if (localAudioUri) {
        setRecordingUri(localAudioUri);
        setRecordingDuration(audioDuration);
      }
    } finally {
      setSending(false);
      setUploadingAudio(null);
    }
  };

  const handlePickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to send images.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera permissions to take photos.');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleEmojiPress = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const startRecording = async () => {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant microphone permissions to record voice notes.');
        return;
      }

      // Set audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start waveform animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordingWaveformAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: false,
          }),
          Animated.timing(recordingWaveformAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: false,
          }),
        ])
      ).start();

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error: any) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      // Stop waveform animation
      recordingWaveformAnim.stopAnimation();
      recordingWaveformAnim.setValue(0);

      const status = await recording.getStatusAsync();
      const uri = recording.getURI();
      
      await recording.stopAndUnloadAsync();
      setIsRecording(false);
      
      // Store URI and duration for immediate display
      if (uri) {
        setRecordingUri(uri);
        const duration = status.durationMillis ? Math.floor(status.durationMillis / 1000) : recordingDuration;
        setRecordingDuration(duration);
      }
      // Recording will be sent when user presses send button
    } catch (error: any) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to stop recording.');
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

      // Stop waveform animation
      recordingWaveformAnim.stopAnimation();
      recordingWaveformAnim.setValue(0);

      await recording.stopAndUnloadAsync();
      setIsRecording(false);
      setRecording(null);
      setRecordingUri(null);
      setRecordingDuration(0);
    } catch (error: any) {
      console.error('Error canceling recording:', error);
      // Force cleanup even if error
      setIsRecording(false);
      setRecording(null);
      setRecordingUri(null);
      setRecordingDuration(0);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const playAudio = async (audioUrl: string) => {
    try {
      // Stop current audio if playing
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      if (playingAudio === audioUrl) {
        // If same audio is playing, stop it
        setPlayingAudio(null);
        waveformAnim.stopAnimation();
        waveformAnim.setValue(0);
        return;
      }

      // Load and play new audio (works with both local URIs and remote URLs)
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );

      setSound(newSound);
      setPlayingAudio(audioUrl);

      // Start waveform animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveformAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: false,
          }),
          Animated.timing(waveformAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: false,
          }),
        ])
      ).start();

      // Get duration if not already stored
      const status = await newSound.getStatusAsync();
      if (status.isLoaded && status.durationMillis) {
        const duration = Math.floor(status.durationMillis / 1000);
        setAudioDurations((prev) => ({ ...prev, [audioUrl]: duration }));
      }

      // Handle playback finish
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingAudio(null);
          setSound(null);
          waveformAnim.stopAnimation();
          waveformAnim.setValue(0);
        }
      });
    } catch (error: any) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Failed to play voice note.');
      setPlayingAudio(null);
      waveformAnim.stopAnimation();
      waveformAnim.setValue(0);
    }
  };

  // Format duration helper
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
      if (sound) {
        sound.unloadAsync();
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Common emojis
  const commonEmojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'];

  const handleBack = () => {
    navigation.goBack();
  };


  const getSenderName = (msg: ChatMessage) => {
    if (msg.senderType === 'USER') {
      return msg.user?.firstName && msg.user?.lastName
        ? `${msg.user.firstName} ${msg.user.lastName}`
        : msg.user?.email || 'You';
    } else if (msg.senderType === 'ADMIN') {
      return msg.user?.firstName && msg.user?.lastName
        ? `${msg.user.firstName} ${msg.user.lastName}`
        : 'Business Product Expert';
    }
    return 'System';
  };

  const isUserMessage = (msg: ChatMessage) => {
    // For regular users: show their own messages on the right
    // For admins: show admin messages on the right, user messages on the left
    if (user?.role === 'ADMIN') {
      return msg.senderType === 'ADMIN';
    }
    return msg.senderType === 'USER' && msg.userId === user?.id;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !session) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.danger} />
          <Text style={styles.errorTitle}>Unable to Load Chat</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setLoading(true);
              // Re-initialize chat
              if (token) {
                chatService.connect(token);
                chatService.getOrCreateSession()
                  .then((chatSession) => {
                    setSession(chatSession);
                    chatService.joinSession(chatSession.id);
                    return chatService.getMessages(chatSession.id);
                  })
                  .then((messagesData) => {
                    setMessages(messagesData.messages || []);
                    if (session) {
                      chatService.markAsRead(session.id);
                    }
                    setLoading(false);
                    setError(null);
                  })
                  .catch((err) => {
                    console.error('Retry error:', err);
                    setError(err.message || 'Failed to load chat');
                    setLoading(false);
                  });
              }
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            {user?.role === 'ADMIN' && session?.user && (
              <View style={styles.headerUserInfo}>
                <Text style={styles.headerUserName}>
                  {session.user.firstName && session.user.lastName
                    ? `${session.user.firstName} ${session.user.lastName}`
                    : session.user.email || 'User'}
                </Text>
                <Text style={styles.headerUserEmail}>{session.user.email}</Text>
              </View>
            )}
            {user?.role !== 'ADMIN' && (
              <TouchableOpacity style={styles.headerIconButton}>
                <Ionicons name="ellipsis-horizontal" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            )}
          </View>
          {user?.role !== 'ADMIN' && (
            <TouchableOpacity style={styles.headerIconButton}>
              <Ionicons name="remove" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Messages */}
        <ImageBackground
          source={{ uri: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRg6RV7_V-LbOSRc1HKqETGFInS-y3tHI24rA&s' }}
          style={styles.messagesContainer}
          imageStyle={styles.backgroundImage}
          resizeMode="repeat"
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesScrollView}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }}
          >
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              {/* Animated Chat Icon */}
              <Animated.View
                style={[
                  styles.emptyIconContainer,
                  {
                    transform: [
                      {
                        scale: iconAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.chatIconWrapper}>
                  <Ionicons name="chatbubbles" size={80} color={colors.accent} />
                </View>
              </Animated.View>

              {/* Welcome Message */}
              <Text style={styles.emptyTitle}>Welcome to Chat! 👋</Text>
              <Text style={styles.emptySubtitle}>
                We're here to help you with any questions or concerns
              </Text>

              {/* Quick Suggestions */}
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsTitle}>Try asking:</Text>
                <View style={styles.suggestionsList}>
                  <TouchableOpacity
                    style={styles.suggestionChip}
                    onPress={() => setMessage("Hello! I need help")}
                  >
                    <Ionicons name="help-circle-outline" size={16} color={colors.accent} />
                    <Text style={styles.suggestionText}>I need help</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.suggestionChip}
                    onPress={() => setMessage("What are your trading fees?")}
                  >
                    <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
                    <Text style={styles.suggestionText}>Trading fees</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.suggestionChip}
                    onPress={() => setMessage("How do I deposit funds?")}
                  >
                    <Ionicons name="wallet-outline" size={16} color={colors.accent} />
                    <Text style={styles.suggestionText}>Deposit funds</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Decorative Elements */}
              <View style={styles.decorativeDots}>
                <View style={[styles.dot, styles.dot1]} />
                <View style={[styles.dot, styles.dot2]} />
                <View style={[styles.dot, styles.dot3]} />
              </View>
            </View>
          )}

          {messages.map((msg) => {
            const isUser = isUserMessage(msg);
            const senderName = getSenderName(msg);

            return (
              <View key={msg.id} style={styles.messageWrapper}>
                {!isUser && (
                  <View style={styles.messageHeader}>
                    <View style={styles.agentIconContainer}>
                      <View style={styles.blueIconCircle}>
                        <Ionicons name="chatbubble" size={20} color="#FFFFFF" />
                      </View>
                      <View style={styles.agentIconCircle}>
                        <Text style={styles.agentIconText}>DB</Text>
                      </View>
                    </View>
                    <View style={styles.messageBubble}>
                      {/* Only show sender name for admin viewing user messages */}
                      {user?.role === 'ADMIN' && (
                        <Text style={styles.messageSender}>{senderName}</Text>
                      )}
                      {msg.imageUrl && (
                        <Image
                          source={{ uri: msg.imageUrl }}
                          style={styles.messageImage}
                          resizeMode="cover"
                        />
                      )}
                      {msg.audioUrl && (
                        <View style={styles.voiceNoteWrapper}>
                          <TouchableOpacity
                            style={styles.voiceNoteContainer}
                            onPress={() => playAudio(msg.audioUrl!)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.voiceNotePlayButton}>
                              <Ionicons
                                name={playingAudio === msg.audioUrl ? 'pause' : 'play'}
                                size={18}
                                color="#25D366"
                              />
                            </View>
                            <View style={styles.voiceNoteContent}>
                              <View style={styles.voiceNoteWaveform}>
                                {[20, 28, 18, 32, 22, 26, 20, 30].map((height, index) => {
                                  const isPlaying = playingAudio === msg.audioUrl;
                                  
                                  if (isPlaying) {
                                    const animatedHeight = waveformAnim.interpolate({
                                      inputRange: [0, 1],
                                      outputRange: [height, height + 8],
                                    });
                                    const animatedOpacity = waveformAnim.interpolate({
                                      inputRange: [0, 1],
                                      outputRange: [0.4, 0.9],
                                    });
                                    
                                    return (
                                      <Animated.View
                                        key={index}
                                        style={[
                                          styles.waveformBar,
                                          {
                                            height: animatedHeight,
                                            opacity: animatedOpacity,
                                          },
                                        ]}
                                      />
                                    );
                                  }
                                  
                                  return (
                                    <View
                                      key={index}
                                      style={[
                                        styles.waveformBar,
                                        {
                                          height: height,
                                          opacity: 0.4,
                                        },
                                      ]}
                                    />
                                  );
                                })}
                              </View>
                              <View style={styles.voiceNoteInfo}>
                                <Text style={styles.voiceNoteDuration}>
                                  {formatDuration(audioDurations[msg.audioUrl] || 0)}
                                </Text>
                                {uploadingAudio === msg.audioUrl && (
                                  <View style={styles.uploadingIndicator}>
                                    <ActivityIndicator size="small" color="#667781" />
                                  </View>
                                )}
                              </View>
                            </View>
                          </TouchableOpacity>
                        </View>
                      )}
                      {msg.message && (
                        <Text style={styles.messageText}>{msg.message}</Text>
                      )}
                      <View style={styles.messageTimeContainer}>
                        <Text style={styles.messageTime}>{formatTime(msg.createdAt)}</Text>
                      </View>
                    </View>
                  </View>
                )}
                {isUser && (
                  <View style={styles.userMessageWrapper}>
                    <View style={styles.userMessageBubble}>
                      {msg.imageUrl && (
                        <Image
                          source={{ uri: msg.imageUrl }}
                          style={styles.messageImage}
                          resizeMode="cover"
                        />
                      )}
                      {msg.audioUrl && (
                        <View style={styles.voiceNoteWrapperUser}>
                          <TouchableOpacity
                            style={styles.voiceNoteContainerUser}
                            onPress={() => playAudio(msg.audioUrl!)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.voiceNotePlayButtonUser}>
                              <Ionicons
                                name={playingAudio === msg.audioUrl ? 'pause' : 'play'}
                                size={18}
                                color="#25D366"
                              />
                            </View>
                            <View style={styles.voiceNoteContent}>
                              <View style={styles.voiceNoteWaveform}>
                                {[20, 28, 18, 32, 22, 26, 20, 30].map((height, index) => {
                                  const isPlaying = playingAudio === msg.audioUrl;
                                  
                                  if (isPlaying) {
                                    const animatedHeight = waveformAnim.interpolate({
                                      inputRange: [0, 1],
                                      outputRange: [height, height + 8],
                                    });
                                    const animatedOpacity = waveformAnim.interpolate({
                                      inputRange: [0, 1],
                                      outputRange: [0.4, 0.9],
                                    });
                                    
                                    return (
                                      <Animated.View
                                        key={index}
                                        style={[
                                          styles.waveformBarUser,
                                          {
                                            height: animatedHeight,
                                            opacity: animatedOpacity,
                                          },
                                        ]}
                                      />
                                    );
                                  }
                                  
                                  return (
                                    <View
                                      key={index}
                                      style={[
                                        styles.waveformBarUser,
                                        {
                                          height: height,
                                          opacity: 0.4,
                                        },
                                      ]}
                                    />
                                  );
                                })}
                              </View>
                              <View style={styles.voiceNoteInfo}>
                                <Text style={styles.voiceNoteDurationUser}>
                                  {formatDuration(audioDurations[msg.audioUrl] || 0)}
                                </Text>
                                {uploadingAudio === msg.audioUrl && (
                                  <View style={styles.uploadingIndicator}>
                                    <ActivityIndicator size="small" color="#667781" />
                                  </View>
                                )}
                              </View>
                            </View>
                          </TouchableOpacity>
                        </View>
                      )}
                      {msg.message && (
                        <Text style={styles.userMessageText}>{msg.message}</Text>
                      )}
                      <View style={styles.messageTimeContainer}>
                        <Text style={styles.userMessageTime}>{formatTime(msg.createdAt)}</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          {otherUserTyping && (
            <View style={styles.messageWrapper}>
              <View style={styles.messageHeader}>
                <View style={styles.agentIconContainer}>
                  <View style={styles.blueIconCircle}>
                    <Ionicons name="chatbubble" size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.agentIconCircle}>
                    <Text style={styles.agentIconText}>DB</Text>
                  </View>
                </View>
                <View style={styles.typingBubble}>
                  <View style={styles.typingDots}>
                    <View style={[styles.typingDot, styles.typingDot1]} />
                    <View style={[styles.typingDot, styles.typingDot2]} />
                    <View style={[styles.typingDot, styles.typingDot3]} />
                  </View>
                </View>
              </View>
            </View>
          )}
          </ScrollView>
        </ImageBackground>

        {/* Selected Image Preview */}
        {selectedImage && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selectedImage }} style={styles.imagePreview} resizeMode="cover" />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => setSelectedImage(null)}
            >
              <Ionicons name="close-circle" size={24} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}

        {/* Recording Indicator */}
        {isRecording && (
          <View style={styles.recordingContainer}>
            <View style={styles.recordingContent}>
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>
                  {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.cancelRecordingButton}
                onPress={cancelRecording}
              >
                <Ionicons name="close" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.inputIconButton}
            onPress={() => {
              Alert.alert(
                'Select Image',
                'Choose an option',
                [
                  { text: 'Camera', onPress: handleTakePhoto },
                  { text: 'Gallery', onPress: handlePickImage },
                  { text: 'Cancel', style: 'cancel' },
                ]
              );
            }}
          >
            <Ionicons name="image-outline" size={24} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.inputIconButton}
            onPress={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <Ionicons name="happy-outline" size={24} color={colors.textMuted} />
          </TouchableOpacity>
          {!isRecording && !recordingUri ? (
            <>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                value={message}
                onChangeText={setMessage}
                placeholder="Write a message..."
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={5000}
                editable={!sending}
              />
              <TouchableOpacity
                style={styles.inputIconButton}
                onPress={startRecording}
                onLongPress={startRecording}
                delayLongPress={100}
              >
                <Ionicons name="mic-outline" size={24} color={colors.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  ((!message.trim() && !selectedImage && !recordingUri) || sending) && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={(!message.trim() && !selectedImage && !recordingUri) || sending}
              >
                {sending || uploadingImage ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </>
          ) : isRecording ? (
            <>
              {/* WhatsApp-style recording UI */}
              <View style={styles.whatsappRecordingContainer}>
                <View style={styles.whatsappRecordingContent}>
                  {/* Animated waveform */}
                  <View style={styles.whatsappWaveform}>
                    {[20, 28, 18, 32, 22, 26, 20, 30, 24, 28].map((height, index) => {
                      const animatedHeight = recordingWaveformAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [height, height + 10],
                      });
                      const animatedOpacity = recordingWaveformAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1],
                      });
                      return (
                        <Animated.View
                          key={index}
                          style={[
                            styles.whatsappWaveformBar,
                            {
                              height: animatedHeight,
                              opacity: animatedOpacity,
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                  {/* Timer */}
                  <Text style={styles.whatsappRecordingTimer}>
                    {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.whatsappCancelButton}
                onPress={cancelRecording}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.whatsappStopButton}
                onPress={stopRecording}
              >
                <Ionicons name="checkmark" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          ) : recordingUri ? (
            <>
              {/* WhatsApp-style preview bubble - tap to play */}
              <TouchableOpacity
                style={styles.whatsappPreviewBubble}
                onPress={() => {
                  // Play preview
                  playAudio(recordingUri);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.whatsappPreviewPlayButton}>
                  <Ionicons
                    name={playingAudio === recordingUri ? 'pause' : 'play'}
                    size={18}
                    color="#FFFFFF"
                  />
                </View>
                <View style={styles.whatsappPreviewWaveform}>
                  {[12, 18, 10, 22, 14, 20, 12, 24, 16, 18].map((height, index) => (
                    <View
                      key={index}
                      style={[
                        styles.whatsappPreviewWaveformBar,
                        { height: height },
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.whatsappPreviewDuration}>
                  {formatDuration(recordingDuration)}
                </Text>
              </TouchableOpacity>
              {/* Cancel button - smaller, less prominent */}
              <TouchableOpacity
                onPress={cancelRecording}
                style={styles.whatsappPreviewCancelButton}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              {/* Send button - LARGE and PROMINENT like WhatsApp */}
              <TouchableOpacity
                style={[styles.whatsappSendButton, sending && styles.whatsappSendButtonDisabled]}
                onPress={handleSend}
                disabled={sending}
                activeOpacity={0.8}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="arrow-up" size={24} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        {/* Emoji Picker Modal */}
        <Modal
          visible={showEmojiPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowEmojiPicker(false)}
        >
          <View style={styles.emojiPickerContainer}>
            <View style={styles.emojiPickerHeader}>
              <Text style={styles.emojiPickerTitle}>Select Emoji</Text>
              <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.emojiPickerContent}>
              <View style={styles.emojiGrid}>
                {commonEmojis.map((emoji, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.emojiButton}
                    onPress={() => handleEmojiPress(emoji)}
                  >
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
  root: {
    flex: 1,
    backgroundColor: colors.background, // Dark theme background
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card, // Dark theme header
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    minHeight: 56,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  headerUserInfo: {
    marginLeft: 8,
  },
  headerUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary, // White text for dark theme
  },
  headerUserEmail: {
    fontSize: 12,
    color: colors.textSecondary, // Light gray for dark theme
  },
  headerIconButton: {
    padding: 4,
  },
  messagesContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundImage: {
    opacity: 1,
  },
  messagesScrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    position: 'relative',
  },
  emptyIconContainer: {
    marginTop: 120,
    marginBottom: 24,
  },
  chatIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.accent + '20', // Accent background for dark theme
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary, // White text for dark theme
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textSecondary, // Light gray for dark theme
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  suggestionsContainer: {
    width: '100%',
    marginTop: 16,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary, // Light gray for dark theme
    marginBottom: 12,
    textAlign: 'center',
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card, // Dark card background
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.accent,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  suggestionText: {
    fontSize: 13,
    color: colors.accent, // Accent color for visibility on dark
    fontWeight: '600',
  },
  decorativeDots: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent + '40',
  },
  dot1: {
    opacity: 0.6,
  },
  dot2: {
    opacity: 0.8,
  },
  dot3: {
    opacity: 0.6,
  },
  messageWrapper: {
    marginBottom: 4, // WhatsApp style - tighter spacing
    paddingHorizontal: 8,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end', // Align to bottom like WhatsApp
    marginBottom: 2,
  },
  agentIconContainer: {
    marginRight: 8, // Tighter spacing like WhatsApp
    flexDirection: 'row',
    alignItems: 'flex-end', // Align to bottom
    gap: 4,
    marginBottom: 2,
  },
  blueIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentIconText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.background,
  },
  messageBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderTopLeftRadius: 2, // WhatsApp style - small tail on left
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: 6,
    maxWidth: '75%',
    // Minimal shadow like WhatsApp
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  messageSender: {
    fontSize: 13,
    fontWeight: '600',
    color: '#667781', // WhatsApp gray for sender name
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14.5,
    color: '#111B21', // WhatsApp dark text
    lineHeight: 19,
    marginBottom: 2,
  },
  messageTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 11,
    color: '#667781', // WhatsApp gray timestamp
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
    marginBottom: 2,
    paddingHorizontal: 8,
  },
  userMessageBubble: {
    backgroundColor: '#DCF8C6', // WhatsApp green for sent messages
    borderRadius: 8,
    borderTopRightRadius: 2, // WhatsApp style - small tail on right
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: 6,
    maxWidth: '75%',
    // Minimal shadow like WhatsApp
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  userMessageText: {
    fontSize: 14.5,
    color: '#111B21', // Dark text on green background (WhatsApp style)
    lineHeight: 19,
    marginBottom: 2,
  },
  userMessageTime: {
    fontSize: 11,
    color: '#667781', // WhatsApp gray timestamp
  },
  typingBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textSecondary, // Light gray dots for dark theme
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.6,
  },
  typingDot3: {
    opacity: 0.8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card, // Dark theme input container
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  inputIconButton: {
    padding: 8,
    marginRight: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
    color: colors.textPrimary, // White text for dark theme
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#9E9E9E',
    opacity: 0.5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.card, // Dark theme footer
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary, // Light gray for dark theme
    marginRight: 8,
  },
  imagePreviewContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  imagePreview: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 20,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  messageImage: {
    width: 250,
    height: 250,
    borderRadius: 8,
    marginBottom: 4,
    marginTop: 4,
  },
  emojiPickerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  emojiPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  emojiPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emojiPickerContent: {
    backgroundColor: colors.card,
    maxHeight: 300,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
  },
  emojiButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  emojiText: {
    fontSize: 28,
  },
  liveChatLogo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveChatSquare: {
    width: 16,
    height: 16,
    backgroundColor: '#FF6B35',
    borderRadius: 2,
    marginRight: 6,
  },
  liveChatText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary, // Light gray for dark theme
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  recordingContainer: {
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  recordingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.danger,
  },
  recordingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cancelRecordingButton: {
    padding: 8,
    marginRight: 4,
  },
  // WhatsApp-style recording styles
  whatsappRecordingContainer: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    minHeight: 50,
    justifyContent: 'center',
  },
  whatsappRecordingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  whatsappWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
    height: 32,
    justifyContent: 'center',
  },
  whatsappWaveformBar: {
    width: 3,
    backgroundColor: colors.danger,
    borderRadius: 2,
    minHeight: 4,
    maxHeight: 32,
  },
  whatsappRecordingTimer: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginHorizontal: 12,
    minWidth: 45,
    textAlign: 'center',
  },
  whatsappCancelButton: {
    padding: 10,
    marginRight: 4,
  },
  whatsappStopButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  // WhatsApp-style preview
  whatsappPreviewBubble: {
    flex: 1,
    backgroundColor: '#DCF8C6', // WhatsApp green for sent
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
  },
  whatsappPreviewPlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappPreviewWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
    flex: 1,
    height: 24,
    justifyContent: 'center',
  },
  whatsappPreviewWaveformBar: {
    width: 2.5,
    backgroundColor: '#25D366',
    borderRadius: 1.5,
    minHeight: 4,
    maxHeight: 24,
  },
  whatsappPreviewDuration: {
    fontSize: 13,
    fontWeight: '600',
    color: '#667781',
    minWidth: 40,
    textAlign: 'right',
  },
  whatsappPreviewCancelButton: {
    padding: 8,
    marginRight: 4,
  },
  whatsappSendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6,
  },
  whatsappSendButtonDisabled: {
    opacity: 0.6,
  },
  voiceNoteWrapper: {
    marginVertical: 4,
    marginBottom: 2,
  },
  voiceNoteWrapperUser: {
    marginVertical: 4,
    marginBottom: 2,
  },
  voiceNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 200,
    maxWidth: 280,
  },
  voiceNoteContainerUser: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 200,
    maxWidth: 280,
  },
  voiceNotePlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  voiceNotePlayButtonUser: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  voiceNoteContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voiceNoteWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    flex: 1,
    height: 32,
  },
  waveformBar: {
    width: 3,
    backgroundColor: '#25D366',
    borderRadius: 2,
    minHeight: 4,
    maxHeight: 28,
  },
  waveformBarUser: {
    backgroundColor: '#25D366',
  },
  voiceNoteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  voiceNoteDuration: {
    fontSize: 13,
    color: '#667781',
    fontWeight: '500',
    minWidth: 35,
  },
  voiceNoteDurationUser: {
    fontSize: 13,
    color: '#667781',
    fontWeight: '500',
    minWidth: 35,
  },
  uploadingIndicator: {
    marginLeft: 4,
  },
});

export default ChatScreen;