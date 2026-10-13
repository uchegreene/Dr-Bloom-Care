export type DemoComment = { id: string; text: string };
export type DemoPost = { id: string; author: string; text: string; tag: string; likes: number; liked: boolean; comments: DemoComment[] };
export type DemoMessage = { id: string; text: string; mine: boolean };
export type DemoState = { posts: DemoPost[]; messages: DemoMessage[] };
export type DemoAction =
  | { type: "like"; id: string }
  | { type: "comment"; id: string; text: string; key: string }
  | { type: "post"; text: string; key: string }
  | { type: "message"; text: string; key: string };

const examples = [
  ["Journey", "Looking forward to meeting my little one. What are your favourite ways to organise baby clothes?"],
  ["Health", "Making time for rest and writing down questions for my next appointment."],
  ["Journey", "A small win today: I made time for a quiet break. Sharing encouragement with everyone here!"],
  ["Advice", "I keep a notebook for questions to ask my care team. How do you organise yours?"],
  ["Journey", "Planning a relaxed weekend and catching up with friends. What are your plans?"],
];
export function createDemoState(offset = Math.floor(Math.random() * examples.length)): DemoState {
  return {
    posts: Array.from({ length: 4 }, (_, i) => {
      const [tag, text] = examples[(i + Math.abs(offset)) % examples.length];
      return { id: `demo-${i}`, author: `Demo member ${i + 1}`, tag, text, likes: i * 3, liked: false,
        comments: i === 0 ? [{ id: "sample-comment", text: "Lovely idea! (Sample comment)" }] : [] };
    }),
    messages: [{ id: "demo-welcome", text: "This is a sample conversation. No real member or clinician receives messages here.", mine: false }],
  };
}
export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  if (action.type === "like") return { ...state, posts: state.posts.map(p => p.id === action.id
    ? { ...p, liked: !p.liked, likes: Math.max(0, p.likes + (p.liked ? -1 : 1)) } : p) };
  const text = action.text.trim();
  if (!text) return state;
  if (action.type === "post") return { ...state, posts: [{ id: action.key, author: "You (demo)", text, tag: "Journey", likes: 0, liked: false, comments: [] }, ...state.posts] };
  if (action.type === "comment") return { ...state, posts: state.posts.map(p => p.id === action.id ? { ...p, comments: [...p.comments, { id: action.key, text }] } : p) };
  return { ...state, messages: [...state.messages, { id: action.key, text, mine: true }] };
}
