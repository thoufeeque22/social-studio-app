'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { 
  Box, 
  IconButton, 
  Typography, 
  TextField, 
  Avatar, 
  Tooltip,
  InputAdornment,
  Paper
} from '@mui/material';
import { 
  AutoAwesome as AutoAwesomeIcon, 
  Close as CloseIcon, 
  Send as SendIcon,
  SmartToy as BotIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';

/**
 * AIChatbot Component
 * A floating conversational assistant interface using Vercel AI SDK.
 */
export const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const { messages, sendMessage, status, error } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  const isLoading = status === 'submitted' || status === 'streaming';

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, status]);

  const toggleChat = () => setIsOpen(!isOpen);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setManualInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim() || isLoading) return;
    
    const content = manualInput;
    setManualInput('');
    // @ts-expect-error - sendMessage is available in this version of @ai-sdk/react but not in the base types
    await sendMessage({ text: content });
  };

  return (
    <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1300 }}>
      {/* Floating Action Button */}
      <Tooltip title="AI Assistant" placement="left">
        <IconButton
          data-testid="chat-fab"
          onClick={toggleChat}
          sx={{
            width: 56,
            height: 56,
            background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, #a855f7 100%)',
            color: 'white',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            '&:hover': {
              transform: 'scale(1.05)',
              background: 'linear-gradient(135deg, hsl(var(--primary)) 20%, #a855f7 100%)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          {isOpen ? <CloseIcon /> : <AutoAwesomeIcon />}
        </IconButton>
      </Tooltip>

      {/* Chat Window Container */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'fixed',
              bottom: 90,
              right: 24,
              width: 'min(400px, 90vw)',
              height: 'min(600px, 75vh)',
              zIndex: 1400,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <GlassCard
              id="chat-window"
              className="flex flex-col h-full !p-0 overflow-hidden shadow-2xl border-primary/20"
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              <div data-testid="chat-window" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <Box sx={{ 
                  p: 2, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  borderBottom: '1px solid hsla(var(--border) / 0.5)',
                  background: 'hsla(var(--primary) / 0.1)',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                      <BotIcon fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'white' }}>
                        Social Studio AI
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'hsl(var(--muted-foreground))' }}>
                        Always active
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton 
                    data-testid="chat-close-button"
                    size="small" 
                    onClick={toggleChat} 
                    sx={{ color: 'hsl(var(--muted-foreground))' }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>

                {/* Messages Display Area */}
                <Box 
                  ref={scrollRef}
                  sx={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    p: 2, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 2,
                    scrollbarWidth: 'thin',
                    '&::-webkit-scrollbar': { width: 4 },
                    '&::-webkit-scrollbar-thumb': { bgcolor: 'hsla(var(--muted) / 0.5)', borderRadius: 2 }
                  }}
                >
                  {messages.length === 0 && (
                    <Box sx={{ 
                      mt: 4, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      textAlign: 'center',
                      color: 'hsl(var(--muted-foreground))',
                      px: 3
                    }}>
                      <AutoAwesomeIcon sx={{ fontSize: 40, mb: 2, opacity: 0.5, color: 'primary.main' }} />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Hello! I&apos;m your Social Studio assistant.
                      </Typography>

                      <Typography variant="caption" sx={{ mt: 1 }}>
                        Ask me to list upcoming posts, check your media gallery, or schedule a video.
                      </Typography>
                    </Box>
                  )}

                  {messages.map((m) => (
                    <Box 
                      key={m.id}
                      data-testid={m.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}
                      sx={{
                        display: 'flex',
                        justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                        gap: 1.5,
                      }}
                    >
                      {m.role !== 'user' && (
                        <Avatar sx={{ width: 28, height: 28, bgcolor: 'secondary.main', fontSize: '0.8rem' }}>
                          <BotIcon sx={{ fontSize: 16 }} />
                        </Avatar>
                      )}
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1.5,
                          maxWidth: '85%',
                          borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          bgcolor: m.role === 'user' ? 'primary.main' : 'hsla(var(--accent) / 0.5)',
                          color: 'white',
                          border: m.role === 'user' ? 'none' : '1px solid hsla(var(--border) / 0.3)',
                        }}
                      >
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {/* Render text content if available */}
                          {m.content && (
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                              {m.content}
                            </Typography>
                          )}

                          {/* Render parts (including tool invocations) */}
                          {m.parts && m.parts.length > 0 && m.parts.map((part, i) => (
                            <React.Fragment key={i}>
                              {/* Only render part.text if it's different from m.content to avoid duplication */}
                              {part.type === 'text' && part.text && part.text !== m.content && (
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                  {part.text}
                                </Typography>
                              )}
                              
                              {part.type === 'tool-invocation' && (
                                <Box 
                                  data-testid="chat-tool-invocation"
                                  sx={{ 
                                    p: 1, 
                                    borderRadius: 1, 
                                    bgcolor: 'hsla(var(--primary) / 0.1)',
                                    border: '1px dashed hsla(var(--primary) / 0.3)',
                                    fontSize: '0.75rem',
                                  }}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <AutoAwesomeIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                      {part.toolInvocation.state === 'call' ? 'Using' : 'Used'} {part.toolInvocation.toolName.replace(/_/g, ' ')}
                                    </Typography>
                                  </Box>
                                  {part.toolInvocation.state === 'result' && (
                                    <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', fontStyle: 'italic' }}>
                                      {typeof part.toolInvocation.result === 'string' 
                                        ? part.toolInvocation.result 
                                        : Array.isArray(part.toolInvocation.result)
                                          ? `Found ${part.toolInvocation.result.length} items.`
                                          : 'Action completed.'}
                                    </Typography>
                                  )}
                                </Box>
                              )}
                            </React.Fragment>
                          ))}
                          
                          {/* Fallback for empty assistant response after finishing */}
                          {m.role === 'assistant' && !m.content && (!m.parts || m.parts.every(p => p.type !== 'text' || !p.text)) && status !== 'streaming' && (
                            <Typography variant="body2" sx={{ fontStyle: 'italic', opacity: 0.8 }}>
                              {m.parts?.some(p => p.type === 'tool-invocation') ? 'Processed your request.' : 'I couldn\'t find a way to help with that.'}
                            </Typography>
                          )}
                          
                          {/* Fallback for empty assistant response during streaming */}
                          {m.role === 'assistant' && !m.content && (!m.parts || m.parts.every(p => p.type !== 'text' || !p.text)) && status === 'streaming' && (
                            <Box sx={{ display: 'flex', gap: 0.5, py: 0.5 }}>
                              {[0, 1, 2].map((i) => (
                                <motion.div 
                                  key={i}
                                  animate={{ opacity: [0.4, 1, 0.4] }} 
                                  transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }} 
                                  style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: 'currentColor' }} 
                                />
                              ))}
                            </Box>
                          )}
                        </Box>
                      </Paper>
                    </Box>
                  ))}

                  {/* Error State */}
                  {error && (
                    <Box sx={{ p: 1.5, textAlign: 'center' }}>
                      <Typography 
                        data-testid="chat-error-message"
                        variant="caption" 
                        color="error"
                      >
                        Failed to connect. Please check your connection and try again.
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Input Control Area */}
                <Box 
                  component="form"
                  onSubmit={handleSubmit}
                  sx={{ 
                    p: 2, 
                    borderTop: '1px solid hsla(var(--border) / 0.5)',
                    background: 'hsla(var(--background) / 0.8)',
                  }}
                >
                  <TextField
                    fullWidth
                    data-testid="chat-input"
                    placeholder="Type a message..."
                    value={manualInput}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    size="small"
                    autoComplete="off"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        bgcolor: 'hsla(var(--input) / 0.2)',
                        transition: 'background-color 0.2s',
                        '&:hover': { bgcolor: 'hsla(var(--input) / 0.3)' },
                        '&.Mui-focused': { bgcolor: 'hsla(var(--input) / 0.4)' },
                      }
                    }}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton 
                              data-testid="chat-send-button"
                              type="submit" 
                              disabled={!manualInput.trim() || isLoading}
                              sx={{ color: 'primary.main' }}
                            >
                              <SendIcon fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }
                    }}
                  />
                </Box>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};
