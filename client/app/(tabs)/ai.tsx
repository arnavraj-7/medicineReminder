// src/screens/ChatScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  Animated,
  Keyboard,
  TextStyle,
  ViewStyle,
  ImageStyle,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './../../context/ThemeContext';
import { useChatStore } from './../../store/ChatStore';
import { LinearGradient } from 'expo-linear-gradient';

export default function ChatScreen() {
  const { colors } = useTheme();
  
  // Zustand stores
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    initializeChat 
  } = useChatStore();
  
  // Local state
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Initialize chat on mount
  useEffect(() => {
    if (messages.length === 0) {
      initializeChat();
    }
  }, []);

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Pulse animation for online status
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        'Permission Required', 
        'Permission to access camera roll is required to upload medicine bills!'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: false,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && !selectedImage) {
      return;
    }

    const messageText = inputText.trim();
    const imageToSend = selectedImage;
    
    setInputText('');
    setSelectedImage(null);

    try {
      await sendMessage(messageText, imageToSend || undefined);
    } catch (error: any) {
      console.error('Chat error:', error);
      Alert.alert(
        'Error', 
        error.message || 'Failed to send message. Please try again.'
      );
    }
  };

  const renderMessage = ({ item, index }: { item: any; index: number }): React.ReactElement => {
    const isUser = item.role === 'user';
    const isFirst = index === 0;

    return (
      <Animated.View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessage : styles.assistantMessage,
          { opacity: 1 },
        ]}
      >
        {/* Avatar for assistant */}
        {!isUser && (
          <View style={[styles.avatar as ViewStyle, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="medical" size={20} color={colors.primary} />
          </View>
        )}

        <View
          style={[
            styles.messageBubble as ViewStyle,
            (isUser ? styles.userBubble : styles.assistantBubble) as ViewStyle,
            {
              backgroundColor: isUser ? colors.primary : colors.card,
            },
          ]}
        >
          {/* Display uploaded image */}
          {item.image && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: item.image }}
                style={styles.messageImage}
                resizeMode="cover"
              />
              <View style={styles.imageOverlay}>
                <Ionicons name="image-outline" size={20} color="#FFFFFF" />
              </View>
            </View>
          )}
          
          {/* Message text */}
          <Text
            style={[
              styles.messageText as TextStyle,
              { color: isUser ? '#FFFFFF' : colors.text },
            ]}
          >
            {typeof item.content === 'string'
              ? item.content
              : JSON.stringify(item.content, null, 2)}
          </Text>
          
          {/* Display extracted medicines if available */}
          {item.extractedMedicines && item.extractedMedicines.length > 0 && (
            <View style={[styles.extractedMedicines as ViewStyle, { backgroundColor: colors.background }]}>
              <View style={styles.extractedHeader as ViewStyle}>
                <Ionicons name="medical" size={16} color={colors.primary} />
                <Text style={[styles.extractedTitle as TextStyle, { color: colors.text }]}>
                  Detected Medicines
                </Text>
              </View>
              {item.extractedMedicines.map((med: any, idx: number) => (
                <View 
                  key={idx} 
                  style={[
                    styles.medicineItem as ViewStyle, 
                    { 
                      backgroundColor: colors.card,
                      borderLeftColor: colors.primary,
                    }
                  ]}
                >
                  <Text style={[styles.medicineName as TextStyle, { color: colors.text }]}>
                    {med.name}
                  </Text>
                  {med.dosage && (
                    <View style={styles.medicineDetailRow as ViewStyle}>
                      <Ionicons name="flask-outline" size={14} color={colors.subtleText} />
                      <Text style={[styles.medicineDetail as TextStyle, { color: colors.subtleText }]}>
                        {med.dosage}
                      </Text>
                    </View>
                  )}
                  {med.frequency && (
                    <View style={styles.medicineDetailRow as ViewStyle}>
                      <Ionicons name="repeat-outline" size={14} color={colors.subtleText} />
                      <Text style={[styles.medicineDetail as TextStyle, { color: colors.subtleText }]}>
                        {med.frequency}
                      </Text>
                    </View>
                  )}
                  {med.times && med.times.length > 0 && (
                    <View style={styles.medicineDetailRow as ViewStyle}>
                      <Ionicons name="time-outline" size={14} color={colors.subtleText} />
                      <Text style={[styles.medicineDetail as TextStyle, { color: colors.subtleText }]}>
                        {med.times.join(', ')}
                      </Text>
                    </View>
                  )}
                  {med.foodTiming && med.foodTiming !== 'anytime' && (
                    <View style={styles.medicineDetailRow as ViewStyle}>
                      <Ionicons name="restaurant-outline" size={14} color={colors.subtleText} />
                      <Text style={[styles.medicineDetail as TextStyle, { color: colors.subtleText }]}>
                        Take {med.foodTiming} meals
                      </Text>
                    </View>
                  )}
                  {med.description && (
                    <Text style={[styles.medicineDescription as TextStyle, { color: colors.subtleText }]}>
                      {med.description}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
          
          {/* Timestamp */}
          <View style={styles.timestampContainer as ViewStyle}>
            <Text
              style={[
                styles.timestamp as TextStyle,
                { color: isUser ? 'rgba(255,255,255,0.7)' : colors.subtleText },
              ]}
            >
              {new Date(item.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            {isUser && (
              <Ionicons 
                name="checkmark-done" 
                size={14} 
                color="rgba(255,255,255,0.7)" 
              />
            )}
          </View>
        </View>

        {/* Avatar for user */}
        {isUser && (
          <View style={[styles.avatar as ViewStyle, styles.userAvatar as ViewStyle, { backgroundColor: colors.primary + '40' }]}>
            <Ionicons name="person" size={20} color="#FFFFFF" />
          </View>
        )}
      </Animated.View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Premium Header with Gradient */}
      <LinearGradient
        colors={[colors.primary, colors.primary + 'CC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient as ViewStyle}
      >
        <View style={styles.header as ViewStyle}>
          <View style={styles.headerLeft as ViewStyle}>
            <View style={styles.botIconContainer as ViewStyle}>
              <Ionicons name="medical" size={28} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.headerTitle as TextStyle}>MediBot</Text>
              <View style={styles.statusBadge as ViewStyle}>
                <Animated.View 
                  style={[
                    styles.statusDot as ViewStyle, 
                    { transform: [{ scale: pulseAnim }] }
                  ]} 
                />
                <Text style={styles.statusText as TextStyle}>Always here to help</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList as ViewStyle}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer as ViewStyle}>
            <View style={[styles.emptyIconContainer as ViewStyle, { backgroundColor: colors.card }]}>
              <Ionicons name="chatbubbles-outline" size={64} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle as TextStyle, { color: colors.text }]}>
              Start Your Health Journey
            </Text>
            <Text style={[styles.emptyText as TextStyle, { color: colors.subtleText }]}>
              Upload a prescription, ask about medicines,{'\n'}or track your medication schedule
            </Text>
          </View>
        }
      />

      {/* Loading Indicator */}
      {isLoading && (
        <View style={[styles.loadingContainer as ViewStyle, { backgroundColor: colors.card }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText as TextStyle, { color: colors.text }]}>
            MediBot is analyzing
          </Text>
          <View style={styles.typingDots as ViewStyle}>
            <View style={[styles.dot as ViewStyle, { backgroundColor: colors.primary }]} />
            <View style={[styles.dot as ViewStyle, { backgroundColor: colors.primary }]} />
            <View style={[styles.dot as ViewStyle, { backgroundColor: colors.primary }]} />
          </View>
        </View>
      )}

      {/* Selected Image Preview */}
      {selectedImage && (
        <View style={[styles.selectedImageContainer as ViewStyle, { backgroundColor: colors.card }]}>
          <Image
            source={{ uri: selectedImage }}
            style={styles.selectedImage as ImageStyle}
            resizeMode="cover"
          />
          <View style={styles.imageInfo as ViewStyle}>
            <View style={[styles.imageIcon as ViewStyle, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="image" size={16} color={colors.primary} />
            </View>
            <View style={styles.imageTextContainer as ViewStyle}>
              <Text style={[styles.imageTitle as TextStyle, { color: colors.text }]}>
                Medicine bill attached
              </Text>
              <Text style={[styles.imageSubtitle as TextStyle, { color: colors.subtleText }]}>
                Ready to analyze
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={() => setSelectedImage(null)}
          >
            <Ionicons name="close-circle" size={24} color={colors.error} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input Container - Fixed positioning */}
      <View 
        style={[
          styles.inputWrapper,
          { 
            backgroundColor: colors.card,
            paddingBottom: Platform.OS === 'ios' ? 34 : 12,
          }
        ]}
      >
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={[styles.attachButton, { backgroundColor: colors.primary + '15' }]}
            onPress={pickImage}
            disabled={isLoading}
          >
            <Ionicons 
              name="camera" 
              size={22} 
              color={isLoading ? colors.subtleText : colors.primary} 
            />
          </TouchableOpacity>

          <View style={[styles.inputBox, { backgroundColor: colors.background }]}>
            <TextInput
              style={[
                styles.input,
                { color: colors.text }
              ]}
              placeholder="Type your message..."
              placeholderTextColor={colors.subtleText}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: (!inputText.trim() && !selectedImage) || isLoading 
                  ? colors.subtleText 
                  : colors.primary,
              },
            ]}
            onPress={handleSendMessage}
            disabled={(!inputText.trim() && !selectedImage) || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  botIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  statusText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  messageContainer: {
    marginBottom: 16,
    flexDirection: 'row',
    gap: 8,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatar: {
    // No 'order' property - this is not supported in React Native
  } as ViewStyle,
  messageBubble: {
    flex: 1,
    padding: 14,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  messageImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  imageOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 6,
    borderRadius: 8,
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  timestamp: {
    fontSize: 11,
    fontWeight: '500',
  },
  extractedMedicines: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
  },
  extractedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  extractedTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  medicineItem: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  medicineDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  medicineDetail: {
    fontSize: 14,
    lineHeight: 20,
  },
  medicineDescription: {
    fontSize: 13,
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  selectedImageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  imageInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  imageIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageTextContainer: {
    flex: 1,
  },
  imageTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  imageSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  removeImageButton: {
    padding: 4,
  },
  inputWrapper: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputBox: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  input: {
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 10,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});