import React, { useState, useRef, useEffect } from 'react';
import { useLiveSDK } from '../context/LiveSDKContext';
import styles from './AIConsole.module.css';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'error';
  content: string;
  timestamp: Date;
}

/**
 * AI Console - Natural language interface for controlling the UI
 */
export function AIConsole() {
  const { processIntent, executeActionPlan, registry } = useLiveSDK();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'system',
      content: 'LiveUI AI Assistant ready. Try commands like "open order 123" or "show analytics".',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (type: Message['type'], content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedInput = input.trim();
    if (!trimmedInput || isProcessing) return;

    setInput('');
    addMessage('user', trimmedInput);
    setIsProcessing(true);

    try {
      // Process the intent
      const result = await processIntent(trimmedInput);

      if (!result.success) {
        addMessage('error', result.explanation);
        return;
      }

      // Show the plan
      if (result.suggestedResponse) {
        addMessage('assistant', result.suggestedResponse);
      }

      // Execute the plan
      if (result.plan.length > 0) {
        addMessage('system', 'Executing plan...');
        const results = await executeActionPlan(result.plan);

        // Report results
        const successes = results.filter((r) => r.success).length;
        const failures = results.filter((r) => !r.success).length;

        if (failures > 0) {
          const errorMessages = results
            .filter((r) => !r.success)
            .map((r) => `Step ${r.stepId}: ${r.error}`)
            .join('\n');
          addMessage('error', `${failures} step(s) failed:\n${errorMessages}`);
        }

        if (successes > 0) {
          const lastSuccess = results.filter((r) => r.success).pop();
          let resultMessage = `Completed ${successes} step(s) successfully.`;

          if (lastSuccess?.result !== undefined) {
            resultMessage += `\nResult: ${JSON.stringify(lastSuccess.result, null, 2)}`;
          }

          addMessage('assistant', resultMessage);
        }
      }
    } catch (error) {
      addMessage('error', error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
  };

  // Quick action suggestions based on loaded modules
  const quickActions: string[] = [];

  if (registry.entries.has('auth')) {
    quickActions.push('login as admin');
  }

  if (registry.entries.has('orders')) {
    quickActions.push('open order 123');
    quickActions.push('open order 456 and mark as shipped');
  }

  if (registry.entries.has('analytics')) {
    quickActions.push('show analytics');
  }

  return (
    <div className={styles.console}>
      <div className={styles.header}>
        <h3 className={styles.title}>AI Console</h3>
        <span className={styles.subtitle}>Natural language UI control</span>
      </div>

      <div className={styles.messages}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`${styles.message} ${styles[message.type]}`}
          >
            <span className={styles.messageType}>
              {message.type === 'user' ? 'You' :
               message.type === 'assistant' ? 'AI' :
               message.type === 'system' ? 'System' : 'Error'}
            </span>
            <pre className={styles.messageContent}>{message.content}</pre>
            <span className={styles.messageTime}>
              {message.timestamp.toLocaleTimeString()}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {quickActions.length > 0 && (
        <div className={styles.quickActions}>
          <span className={styles.quickActionsLabel}>Quick actions:</span>
          {quickActions.map((action) => (
            <button
              key={action}
              className={styles.quickActionButton}
              onClick={() => handleQuickAction(action)}
            >
              {action}
            </button>
          ))}
        </div>
      )}

      <form className={styles.inputForm} onSubmit={handleSubmit}>
        <input
          type="text"
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a command in natural language..."
          disabled={isProcessing}
        />
        <button
          type="submit"
          className={styles.sendButton}
          disabled={isProcessing || !input.trim()}
        >
          {isProcessing ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
