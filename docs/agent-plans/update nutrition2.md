Goal: Rebuild components/nutrition/ChatInputBar.tsx (replacing ChatInput.tsx) with WhatsApp-style UX — dynamic send/mic button, hold-to-record with slide-to-cancel, manual transcript confirmation before sending, plus add an AI typing indicator to components/nutrition/NutritionChat.tsx.

Context:

Files affected: components/nutrition/ChatInputBar.tsx (new, replaces ChatInput.tsx), components/nutrition/NutritionChat.tsx (add typing indicator + wire new input)

Stack: React Native 0.81, expo-av (Audio.Recording), expo-image-picker, lucide-react-native, react-native-reanimated v4, Animated + PanResponder from RN core

Theme: useThemeStore() → colors, isDark; spacing from constants/spacing; typography from constants/typography

Existing: useToastStore().show(message, type), cn() from @/lib/utils

NutritionChat.tsx already has: messages: ChatMessage[], isLoading: boolean state, handleSendText(text), handleAudioRecorded(uri), handleImageSelected(uri) — wire ChatInputBar to these

Task A — components/nutrition/ChatInputBar.tsx

// CLEANUP: replaces components/nutrition/ChatInput.tsx — delete after wiring

Layout (identical proportions to WhatsApp):

text
[ Paperclip 24px ]  [ ─── TextInput (flex 1) ─── ]  [ ● 44px round button ]
Container: flexDirection: row, alignItems: flex-end, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border

Attach button: Paperclip icon, paddingHorizontal: 8, aligned to bottom of input

TextInput: flex: 1, multiline, maxHeight: 120, minHeight: 44, borderRadius: 22, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: colors.foreground, placeholderTextColor: colors.mutedForeground, placeholder "O que comeste?"

Right button: width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: center, justifyContent: center

Right button — state machine:

State	Condition	Icon	Behavior
SEND	text.length > 0	ArrowUp 20px white	onPress → onSendText(text) → clear input
AUDIO	text.length === 0	Mic 20px white	onPressIn → start recording; onPressOut → stop → show preview
RECORDING	during hold	MicOff 20px white + pulse ring	slide-to-cancel active
Mode switch animation: useRef(new Animated.Value(0)) — 0 = AUDIO, 1 = SEND. On change: Animated.spring({ toValue, useNativeDriver: true, damping: 15, stiffness: 200 }). Each icon wrapped in Animated.View with transform: [{ scale }] and opacity derived from the same value via interpolate. The outgoing icon scales 1→0.6 + opacity 1→0, incoming scales 0.6→1 + opacity 0→1, both on the same 150ms spring.

Recording flow — MANUAL CONFIRM before sending:

onPressIn on AUDIO button → Audio.requestPermissionsAsync() → if denied: showToast('Permissão de microfone necessária', 'error') and abort → else start Audio.Recording with Audio.RecordingOptionsPresets.HIGH_QUALITY

Switch button to RECORDING state — show pulse ring (Animated.loop expanding View with borderColor: colors.primary, scale 1→1.6, opacity 1→0, duration 900ms)

Show recording indicator bar (see below)

onPressOut (no cancel gesture) → stop recording → get URI → do NOT call onAudioRecorded yet — instead switch to Preview state:

Preview state (transcript pending):

Recording indicator bar content changes to show:

text
[ ▶ play button ]  [ "Áudio gravado — 0:12" ]  [ ✕ discard ]  [ ➤ Enviar ]
"Enviar" button → calls onAudioRecorded(uri) → dismisses bar → resets state

"✕ discard" → deletes recording, resets state, shows nothing

▶ play button → Audio.Sound.createAsync(uri) then sound.playAsync() — toggle play/stop

This matches the WhatsApp voice message preview UX exactly

Slide-to-cancel (during RECORDING only, before release):

PanResponder on the right button (created with useMemo, active only when isRecording === true)

Track gestureState.dx (horizontal drag left = negative)

dx < -60: show cancel cue — recording indicator text turns colors.error, label changes to "Soltar para cancelar", button background shifts to colors.muted

dx < -120 OR release while dx < -80: cancel → stop recording, delete file, reset all state (no onAudioRecorded call)

Recording indicator translateX: Animated.Value set to Math.min(0, gestureState.dx * 0.4) on each move

Indicator opacity: interpolate(translateXAnim, [0, -100], [1, 0.4])

Recording indicator bar:

position: absolute, bottom: inputBarHeight (measured with onLayout), left: 0, right: 0

backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 16, paddingVertical: 10

Slides in: Animated.spring({ toValue: 0, from: 40 }) on translateY; slides out: spring to 40

During recording content:

text
[ 🔴 pulsing dot ]  [ A gravar...  0:08 ]  [ ← Desliza para cancelar ]
Red dot: Animated.loop scale 0.8→1.2, duration 600ms, backgroundColor: '#ef4444', width: 10, height: 10, borderRadius: 5

Duration counter: setInterval in useRef (1 second), format M:SS, cleared on stop/cancel

Cancel hint: colors.mutedForeground, typography.caption

During preview content: play/discard/send row (see Preview state above)

Attach button:

expo-image-picker launchImageLibraryAsync({ mediaTypes: 'Images', quality: 0.8 })

ImagePicker.requestMediaLibraryPermissionsAsync() lazily on first use — if denied: showToast

On selection → onImageSelected(uri) callback

Disable attach button while picker is open (isPickerOpen local state)

Props:

ts
interface ChatInputBarProps {
  onSendText: (text: string) => void
  onAudioRecorded: (uri: string) => void
  onImageSelected: (uri: string) => void
  disabled?: boolean
}
Task B — AI Typing Indicator in NutritionChat.tsx

Add a TypingIndicator component rendered inline inside the chat message list when isLoading === true.

TypingIndicator (inline component at top of NutritionChat.tsx, not a separate file):

text
[ AI avatar 28px ]  [ ● ● ● animated bubbles ]
Container: same flexDirection: row, alignItems: flex-end, gap: spacing.xs as user message row, left-aligned

AI avatar: width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary + '22', centered Sparkles icon from lucide-react-native, size: 14, color: colors.primary

Bubble: backgroundColor: colors.card, borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.border

Inside bubble: 3 dots in a row, gap: 4

Each dot: width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.mutedForeground

Animation: staggered Animated.loop with Animated.sequence([Animated.timing(up, {toValue:-6,duration:300}), Animated.timing(up,{toValue:0,duration:300})]) — dot 1 delay 0ms, dot 2 delay 150ms, dot 3 delay 300ms, all useNativeDriver: true, translateY

Each dot Animated.Value in useRef array, loops started with useEffect on mount

Whole indicator fades in with Animated.timing(fadeAnim, { toValue: 1, duration: 200 }) when isLoading becomes true; fades out and unmounts when false

Insert in FlatList/ScrollView as last item when isLoading, scrolls into view automatically (scrollToEnd in useEffect watching isLoading)

Message rendering improvements in NutritionChat.tsx:

AI messages (role: 'assistant'): add Sparkles icon avatar (same 28px style as typing indicator) to the left of each bubble — consistent visual identity for the AI coach

User messages (role: 'user'): add user avatar or initials circle (28px) to the right — use useAuthStore().user?.displayName?.[0] as initial, backgroundColor: colors.primary, color: white

Message timestamps: render typography.caption + colors.mutedForeground below each bubble — format with date-fns format(new Date(msg.createdAt), 'HH:mm')

Audio transcript messages (type: 'user_audio_transcript'): prefix with Mic icon 12px + "Áudio · " label in colors.mutedForeground before the transcript text

Output: Complete components/nutrition/ChatInputBar.tsx (full file) + the modified sections of components/nutrition/NutritionChat.tsx clearly marked with // MODIFIED: comments around each change. Both files end with // TEST: block.

// TEST: checklist for ChatInputBar.tsx:

Permission denied flow for mic → toast appears, no crash

Permission denied for image picker → toast appears

Type text → button switches to Send (ArrowUp), spring animation visible

Clear text → button switches back to Mic, spring animation visible

Hold mic → recording starts, indicator bar slides up, duration counter ticks

Drag left > 120px → recording cancels silently, bar slides down, no callback fired

Release mic normally → indicator switches to preview state (play/discard/send)

Play button in preview → audio plays back

Discard in preview → resets, no callback

Send in preview → onAudioRecorded fires with valid URI

Attach button → image picker opens, selection calls onImageSelected

disabled=true → all interactions blocked

// TEST: checklist for NutritionChat.tsx:

Send message → typing indicator appears immediately below last user message

Indicator dots animate in staggered bounce

AI response arrives → indicator fades out and is replaced by message bubble

AI bubbles all have Sparkles avatar on left

User bubbles have initial avatar on right

Timestamps visible below each bubble

Audio transcript messages show Mic icon prefix

scrollToEnd fires when typing indicator appears

Constraints: No new dependencies. Strict TypeScript, no any. All Animated.Value via useRef. PanResponder via useMemo. setInterval for duration counter in useRef, always cleared in cleanup. Permissions requested lazily. isRecording, isPreview, isPicking as separate boolean state values — no enum string state machine. Both files self-contained.