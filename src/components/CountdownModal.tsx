import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Animated,
    Easing,
} from 'react-native';
import { colors } from '../theme/colors';

interface CountdownModalProps {
    visible: boolean;
    duration: number; // seconds
    symbol: string;
    amount: number;
    expectedProfit: number;
    ror: number;
    onComplete: () => void;
}

const CountdownModal: React.FC<CountdownModalProps> = ({
    visible,
    duration,
    symbol,
    amount,
    expectedProfit,
    ror,
    onComplete,
}) => {
    const [timeLeft, setTimeLeft] = useState(duration);
    const progressAnimation = useRef(new Animated.Value(0)).current;
    // Use ref for onComplete to avoid re-creating the interval when callback reference changes
    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;

    useEffect(() => {
        if (visible) {
            setTimeLeft(duration);
            progressAnimation.setValue(0);

            Animated.timing(progressAnimation, {
                toValue: 1,
                duration: duration * 1000,
                easing: Easing.linear,
                useNativeDriver: false,
            }).start();
        }
    }, [visible, duration]);

    useEffect(() => {
        if (!visible) return;

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    onCompleteRef.current();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [visible, duration]);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const progressWidth = progressAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <Modal visible={visible} transparent animationType="none">
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <Text style={styles.title}>Option Order Active</Text>
                    <Text style={styles.symbol}>{symbol}</Text>

                    {/* Timer */}
                    <View style={styles.timerContainer}>
                        <Text style={styles.timerLabel}>Time Remaining</Text>
                        <Text style={styles.timer}>{formatTime(timeLeft)}</Text>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                        <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
                    </View>

                    {/* Order Details */}
                    <View style={styles.detailsContainer}>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Amount</Text>
                            <Text style={styles.detailValue}>${amount.toFixed(2)}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>ROR</Text>
                            <Text style={styles.detailValueAccent}>{ror}%</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Expected Profit</Text>
                            <Text style={styles.detailValueProfit}>+${expectedProfit.toFixed(2)}</Text>
                        </View>
                    </View>

                    {/* Status */}
                    <Text style={styles.status}>
                        Profit will be added when countdown completes...
                    </Text>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
    },
    title: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    symbol: {
        color: colors.accent,
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 24,
    },
    timerContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    timerLabel: {
        color: '#888',
        fontSize: 14,
        marginBottom: 8,
    },
    timer: {
        color: colors.textPrimary,
        fontSize: 56,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
    progressContainer: {
        width: '100%',
        height: 6,
        backgroundColor: '#1a1a1a',
        borderRadius: 3,
        marginBottom: 24,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: colors.accent,
        borderRadius: 3,
    },
    detailsContainer: {
        width: '100%',
        gap: 12,
        marginBottom: 20,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        color: '#888',
        fontSize: 14,
    },
    detailValue: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '600',
    },
    detailValueAccent: {
        color: colors.accent,
        fontSize: 14,
        fontWeight: '600',
    },
    detailValueProfit: {
        color: '#4CAF50',
        fontSize: 16,
        fontWeight: '700',
    },
    status: {
        color: '#888',
        fontSize: 12,
        textAlign: 'center',
        fontStyle: 'italic',
    },
});

export default CountdownModal;
