import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useScopedStorage } from '@/lib/scopedAsyncStorage';
import { useProfile } from '@/hooks/useProfileContext';

export interface Comment {
  id: string;
  authorName: string;
  authorId: string;
  text: string;
  timestamp: string;
}

export interface Post {
  id: string;
  authorName: string;
  authorId: string;
  text: string;
  tag?: string;
  imageUri?: string;
  likes: number;
  liked: boolean;
  comments: Comment[];
  timestamp: string;
}

interface SocialContextType {
  posts: Post[];
  isLoading: boolean;
  addPost: (text: string, tag?: string, imageUri?: string) => Promise<void>;
  likePost: (id: string) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<void>;
}

const SocialContext = createContext<SocialContextType | null>(null);

const SEED_POSTS: Post[] = [
  {
    id: '1',
    authorName: 'Sarah M.',
    authorId: 'user_1',
    text: 'Just hit 20 weeks today, halfway there. Feeling those little kicks is the most magical feeling in the world.',
    tag: 'Journey',
    likes: 12,
    liked: false,
    comments: [
      {
        id: 'c1',
        authorName: 'Emily R.',
        authorId: 'user_2',
        text: 'Congratulations, the second half flies by. Enjoy every kick.',
        timestamp: new Date(Date.now() - 80000000).toISOString(),
      },
    ],
    timestamp: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: '2',
    authorName: 'Emily R.',
    authorId: 'user_2',
    text: 'Any tips for dealing with morning sickness? It seems to hit me worst in the evenings actually.',
    tag: 'Advice',
    likes: 5,
    liked: false,
    comments: [
      {
        id: 'c2',
        authorName: 'Dr. Jane',
        authorId: 'user_4',
        text: 'Small frequent snacks and ginger tea helped a lot of my patients. Keep crackers by the bed too.',
        timestamp: new Date(Date.now() - 82000000).toISOString(),
      },
    ],
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '3',
    authorName: 'Maria L.',
    authorId: 'user_3',
    text: 'Three kids in and my best advice for new moms: sleep when the baby sleeps, accept every offer of help, and be gentle with yourself. You are doing better than you think.',
    tag: 'Advice',
    likes: 28,
    liked: false,
    comments: [],
    timestamp: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: '4',
    authorName: 'Priya K.',
    authorId: 'user_5',
    text: 'Gentle reminder to stay hydrated and take your prenatal vitamins, mamas. Your body is doing incredible work right now.',
    tag: 'Health',
    likes: 19,
    liked: false,
    comments: [],
    timestamp: new Date(Date.now() - 259200000).toISOString(),
  },
];

export function SocialProvider({ children }: { children: ReactNode }) {
  const AsyncStorage = useScopedStorage();
  const { profile } = useProfile();
  const requirePaidMembership = () => {
    if (!profile?.subscriptionActive) throw new Error("An active plan is required to publish or respond.");
  };
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('bloom_posts_v2').then(stored => {
      if (stored) {
        setPosts(JSON.parse(stored));
      } else {
        setPosts([]);
      }
      setIsLoading(false);
    });
  }, []);

  const persist = (updated: Post[]) => {
    AsyncStorage.setItem('bloom_posts_v2', JSON.stringify(updated));
  };

  const addPost = async (text: string, tag?: string, imageUri?: string) => {
    requirePaidMembership();
    const newPost: Post = {
      id: Date.now().toString(),
      authorName: 'You',
      authorId: 'me',
      text,
      tag,
      imageUri,
      likes: 0,
      liked: false,
      comments: [],
      timestamp: new Date().toISOString(),
    };
    setPosts(prev => {
      const updated = [newPost, ...prev];
      persist(updated);
      return updated;
    });
  };

  const likePost = async (id: string) => {
    requirePaidMembership();
    setPosts(prev => {
      const updated = prev.map(p =>
        p.id === id
          ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
          : p,
      );
      persist(updated);
      return updated;
    });
  };

  const addComment = async (postId: string, text: string) => {
    requirePaidMembership();
    const comment: Comment = {
      id: Date.now().toString(),
      authorName: 'You',
      authorId: 'me',
      text,
      timestamp: new Date().toISOString(),
    };
    setPosts(prev => {
      const updated = prev.map(p =>
        p.id === postId ? { ...p, comments: [...p.comments, comment] } : p,
      );
      persist(updated);
      return updated;
    });
  };

  return (
    <SocialContext.Provider value={{ posts, isLoading, addPost, likePost, addComment }}>
      {children}
    </SocialContext.Provider>
  );
}

export const useSocial = () => {
  const context = useContext(SocialContext);
  if (!context) throw new Error("useSocial must be used within SocialProvider");
  return context;
};
