import { useState, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { callNana } from '../../lib/claude'
import { useChildStore } from '../../store/useChildStore'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'Hello dear! I\'m Grandma — ask me anything about your little one. 💚' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const { child } = useChildStore()
  const flatListRef = useRef<FlatList>(null)

  async function sendMessage() {
    if (!input.trim() || loading) return

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const reply = await callNana({
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        child,
      })
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: reply }])
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Sorry dear, I had trouble responding. Please try again!' }])
    } finally {
      setLoading(false)
      flatListRef.current?.scrollToEnd()
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#FAF8F4' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#E8E4DC', paddingTop: 60 }}>
        <Text style={{ fontSize: 20, fontWeight: '600', color: '#1A1A2E' }}>Ask Grandma 👵</Text>
        {child && <Text style={{ fontSize: 13, color: '#888', marginTop: 2 }}>Personalized for {child.name}</Text>}
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <View style={{ alignItems: item.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <View style={{
              maxWidth: '80%', padding: 12, borderRadius: 16,
              backgroundColor: item.role === 'user' ? '#7BAE8E' : '#fff',
              borderWidth: item.role === 'assistant' ? 1 : 0,
              borderColor: '#E8E4DC',
            }}>
              <Text style={{ fontSize: 15, color: item.role === 'user' ? '#fff' : '#1A1A2E', lineHeight: 22 }}>
                {item.content}
              </Text>
            </View>
          </View>
        )}
      />

      {loading && (
        <View style={{ padding: 12, alignItems: 'flex-start', paddingHorizontal: 16 }}>
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8E4DC', borderRadius: 16, padding: 12 }}>
            <ActivityIndicator size="small" color="#7BAE8E" />
          </View>
        </View>
      )}

      <View style={{ flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: '#E8E4DC', backgroundColor: '#FAF8F4' }}>
        <TextInput
          style={{ flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0DDD8', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15 }}
          placeholder="Ask Grandma anything..."
          value={input}
          onChangeText={setInput}
          onSubmitEditing={sendMessage}
          multiline
        />
        <TouchableOpacity
          onPress={sendMessage}
          disabled={loading || !input.trim()}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#7BAE8E', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' }}
        >
          <Text style={{ color: '#fff', fontSize: 18 }}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}