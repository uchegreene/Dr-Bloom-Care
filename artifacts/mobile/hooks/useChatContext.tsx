import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useScopedStorage } from '@/lib/scopedAsyncStorage';
import { useProfile } from '@/hooks/useProfileContext';

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
}

export interface Friend {
  id: string;
  name: string;
  lastMessage?: string;
  avatarInitials: string;
}

interface ChatContextType {
  friends: Friend[];
  messages: Record<string, ChatMessage[]>;
  isLoading: boolean;
  addFriend: (name: string) => Promise<void>;
  sendMessage: (friendId: string, text: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

const SEED_FRIENDS: Friend[] = [
  { id: 'f1', name: 'Dr. Jane (Midwife)', avatarInitials: 'DJ', lastMessage: 'Remember to stay hydrated today!' },
  { id: 'f2', name: 'Anna P.', avatarInitials: 'AP', lastMessage: 'Let\'s catch up this weekend' },
];

// Stored newest-first so the inverted chat FlatList renders correctly.
const SEED_MESSAGES: Record<string, ChatMessage[]> = {
  'f1': [
    { id: 'm3', senderId: 'f1', text: 'Remember to stay hydrated today!', timestamp: new Date(Date.now() - 3600000).toISOString() },
    { id: 'm2', senderId: 'me', text: 'A little tired, but overall good.', timestamp: new Date(Date.now() - 86000000).toISOString() },
    { id: 'm1', senderId: 'f1', text: 'How are you feeling this week?', timestamp: new Date(Date.now() - 86400000).toISOString() },
  ],
  'f2': [
    { id: 'm4', senderId: 'f2', text: "Let's catch up this weekend", timestamp: new Date(Date.now() - 7200000).toISOString() },
    { id: 'm5', senderId: 'me', text: 'Would love that. Coffee on Saturday?', timestamp: new Date(Date.now() - 7000000).toISOString() },
  ],
};

export function ChatProvider({ children }: { children: ReactNode }) {
  const AsyncStorage = useScopedStorage();
  const { profile } = useProfile();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('bloom_friends'),
      AsyncStorage.getItem('bloom_messages')
    ]).then(([storedFriends, storedMessages]) => {
      let f: Friend[] = [];
      let m: Record<string, ChatMessage[]> = {};
      
      if (storedFriends) f = JSON.parse(storedFriends);
      else AsyncStorage.setItem('bloom_friends', JSON.stringify(f));
      
      if (storedMessages) m = JSON.parse(storedMessages);
      else AsyncStorage.setItem('bloom_messages', JSON.stringify(m));

      setFriends(f);
      setMessages(m);
      setIsLoading(false);
    });
  }, []);

  const addFriend = async (name: string) => {
    if (!profile?.subscriptionActive) throw new Error("An active plan is required for messaging.");
    const newFriend: Friend = {
      id: Date.now().toString(),
      name,
      avatarInitials: name.substring(0, 2).toUpperCase()
    };
    setFriends(prev => {
      const updated = [...prev, newFriend];
      AsyncStorage.setItem('bloom_friends', JSON.stringify(updated));
      return updated;
    });
  };

  const sendMessage = async (friendId: string, text: string) => {
    if (!profile?.subscriptionActive) throw new Error("An active plan is required for messaging.");
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: 'me',
      text,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => {
      const thread = prev[friendId] || [];
      const updated = { ...prev, [friendId]: [newMessage, ...thread] }; // Newest-first for inverted FlatList
      AsyncStorage.setItem('bloom_messages', JSON.stringify(updated));
      return updated;
    });

    setFriends(prev => {
      const updated = prev.map(f => f.id === friendId ? { ...f, lastMessage: text } : f);
      AsyncStorage.setItem('bloom_friends', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <ChatContext.Provider value={{ friends, messages, isLoading, addFriend, sendMessage }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within ChatProvider");
  return context;
};
