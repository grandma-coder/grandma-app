import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useChildStore } from '../../store/useChildStore'
import { callNana } from '../../lib/claude'
import type { PillarId } from '../../types'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function Chat() {
  const params = useLocalSearchParams()
  const { child } = useChildStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  const pillarId = typeof params.pillarId === 'string' ? params.pillarId as PillarId : undefined

  // Load chat history from Supabase
  useEffect(() => {
    if (!child?.id) return
    supabase
      .from('chat_messages')
      .select('id, role, content')
      .eq('child_id', child.id)
      .order('created_at', { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setMessages(data.map(m => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content })))
        }
      })
  }, [child?.id])

  useEffect(() => {
    if (params.suggestion && typeof params.suggestion === 'string') {
      setInput(params.suggestion)
    }
  }, [params.suggestion])

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
        pillarId,
      })
      const assistantMessage: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: reply }
      setMessages(prev => [...prev, assistantMessage])

      // Save to Supabase if child exists
      if (child?.id) {
        await supabase.from('chat_messages').insert([
          { child_id: child.id, pillar_id: pillarId ?? null, role: 'user', content: userMessage.content },
          { child_id: child.id, pillar_id: pillarId ?? null, role: 'assistant', content: reply },
        ])
      }
    } catch (e) {
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString(), role: 'assistant', content: 'Sorry dear, try again!' },
      ])
    } finally {
      setLoading(false)
      flatListRef.current?.scrollToEnd()
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#FAF8F4' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 60 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 48 }}>👵</Text>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1A1A2E', marginTop: 12 }}>
              Hi{child ? `, I'm here for ${child.name}` : ' there!'}
            </Text>
            <Text style={{ fontSize: 14, color: '#888', marginTop: 8, textAlign: 'center' }}>
              Ask me anything about your little one
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={{
              alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
              backgroundColor: item.role === 'user' ? '#1A1A2E' : '#fff',
              borderRadius: 16,
              padding: 12,
              marginBottom: 8,
              maxWidth: '80%',
              shadowColor: '#000',
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <Text style={{ color: item.role === 'user' ? '#fff' : '#1A1A2E', fontSize: 15 }}>
              {item.content}
            </Text>
          </View>
        )}
      />

      {loading && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <ActivityIndicator size="small" color="#888" />
        </View>
      )}

      <View
        style={{
          flexDirection: 'row',
          padding: 12,
          borderTopWidth: 1,
          borderTopColor: '#eee',
          backgroundColor: '#fff',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask Grandma..."
          placeholderTextColor="#aaa"
          style={{
            flex: 1,
            backgroundColor: '#F5F5F5',
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 10,
            fontSize: 15,
            color: '#1A1A2E',
          }}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity
          onPress={sendMessage}
          disabled={loading || !input.trim()}
          style={{
            backgroundColor: '#1A1A2E',
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 10,
            opacity: loading || !input.trim() ? 0.4 : 1,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}