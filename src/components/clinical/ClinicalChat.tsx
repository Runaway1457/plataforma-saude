// ============================================================
// ClinicalChat Component - Chat interface for pre-consultation
// ============================================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { useAppStore, ChatMessage } from '@/lib/stores/app-store';
import { RedFlagAlert } from '@/components/shared';
import { TriageBadge } from './TriageBadge';

interface ClinicalChatProps {
  onComplete?: () => void;
}

export function ClinicalChat({ onComplete }: ClinicalChatProps) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    currentPatient,
    currentSession,
    chatMessages,
    addChatMessage,
    clearChatMessages,
    setCurrentSession,
    triageData,
    setTriageData,
  } = useAppStore();

  // Start session when patient is selected
  useEffect(() => {
    const startSession = async () => {
      if (!currentPatient || currentSession) return;

      try {
        const response = await fetch('/api/clinical/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patientId: currentPatient.id }),
        });

        if (response.ok) {
          const data = await response.json();
          setCurrentSession(data.session);
          
          // Add welcome message
          addChatMessage({
            id: 'welcome',
            role: 'ASSISTANT',
            content: `Olá, ${currentPatient.name.split(' ')[0]}! Sou o assistente de pré-consulta. Vou fazer algumas perguntas para entender melhor seus sintomas e preparar sua consulta. Vamos começar? Qual é o principal motivo da sua consulta hoje?`,
            createdAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('Error starting session:', error);
      }
    };

    startSession();

    return () => {
      // Cleanup on unmount
      clearChatMessages();
      setCurrentSession(null);
    };
  }, [currentPatient]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSend = async () => {
    if (!input.trim() || sending || !currentSession) return;

    const userMessage = input.trim();
    setInput('');
    setSending(true);

    // Add user message
    addChatMessage({
      id: Date.now().toString(),
      role: 'USER',
      content: userMessage,
      createdAt: new Date().toISOString(),
    });

    try {
      const response = await fetch('/api/clinical/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSession.id,
          message: userMessage,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Add assistant response
        addChatMessage({
          id: (Date.now() + 1).toString(),
          role: 'ASSISTANT',
          content: data.response,
          confidence: data.confidence,
          createdAt: new Date().toISOString(),
        });

        // Update triage data if available
        if (data.triage) {
          setTriageData(data.triage);
        }

        // Check if session is complete
        if (data.sessionComplete) {
          setSessionComplete(true);
          onComplete?.();
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      addChatMessage({
        id: (Date.now() + 1).toString(),
        role: 'ASSISTANT',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Pode tentar novamente?',
        createdAt: new Date().toISOString(),
      });
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!currentPatient) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-slate-500">
            <User className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>Selecione um paciente para iniciar</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-500" />
            Pré-Consulta
          </CardTitle>
          <div className="flex items-center gap-2">
            {triageData && (
              <TriageBadge priority={triageData.priority as any} size="sm" />
            )}
            {sessionComplete && (
              <Badge variant="outline" className="text-green-600 border-green-300">
                <CheckCircle className="w-3 h-3 mr-1" />
                Completo
              </Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-slate-500">
          Paciente: {currentPatient.name}
        </p>
      </CardHeader>

      {/* Red Flags */}
      {triageData && triageData.redFlags.length > 0 && (
        <div className="p-4 border-b bg-red-50/50">
          <RedFlagAlert flags={triageData.redFlags} />
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {chatMessages.map((message) => (
            <ChatBubble key={message.id} message={message} />
          ))}
          {sending && (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Processando...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <CardContent className="border-t p-4">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={sessionComplete ? "Sessão finalizada" : "Digite sua mensagem..."}
            disabled={sending || sessionComplete}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sending || sessionComplete}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            Enviar
          </Button>
        </div>

        {/* Confidence indicator */}
        {chatMessages.length > 0 && chatMessages[chatMessages.length - 1].confidence && (
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
            <Info className="w-3 h-3" />
            Confiança da análise: {(chatMessages[chatMessages.length - 1].confidence! * 100).toFixed(0)}%
          </div>
        )}

        {/* Disclaimer */}
        <div className="flex items-start gap-2 mt-3 p-2 bg-amber-50 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Esta é uma ferramenta de triagem assistida por IA. Não substitui avaliação médica profissional.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Chat bubble component
function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'USER';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className={isUser ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>
      <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? 'items-end' : ''}`}>
        <div
          className={`rounded-lg px-4 py-2 ${
            isUser
              ? 'bg-blue-500 text-white'
              : 'bg-slate-100 text-slate-800'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        {message.confidence && (
          <Badge variant="outline" className="text-xs">
            Confiança: {(message.confidence * 100).toFixed(0)}%
          </Badge>
        )}
      </div>
    </div>
  );
}
