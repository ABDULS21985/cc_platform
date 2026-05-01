import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Heart,
  MessageCircle,
  Share2,
  ChevronDown,
  Paperclip,
  Smile,
  Image as ImageIcon,
} from 'lucide-react';

const initialPosts = [
  {
    id: 1,
    author: {
      name: '@aishaadwan',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      fallback: 'AA',
    },
    group: 'Crypto academy',
    content: 'Beautiful day to trade #cryptocurrency #coins #money',
    timeAgo: '20m ago',
    likes: 15,
    comments: 2,
    hasImages: true,
    images: [
        'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=600&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=600&auto=format&fit=crop'
    ],
    commentsList: [
        { id: 1, author: 'Jane Doe', content: 'Great insights!', time: '5m' },
        { id: 2, author: 'John Smith', content: 'Bullish on this!', time: '10m' }
    ]
  },
  {
    id: 2,
    author: {
      name: '@johnsmith',
      avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150',
      fallback: 'JS',
    },
    group: 'Tech Community',
    content:
      'Just finished building my first React app! #react #javascript #coding',
    timeAgo: '1h ago',
    likes: 8,
    comments: 0,
    hasImages: true,
    images: [
        'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&auto=format&fit=crop'
    ],
    commentsList: []
  },
  {
    id: 3,
    author: {
      name: '@sarahwilson',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      fallback: 'SW',
    },
    group: 'Design Hub',
    content: 'New UI design concepts for mobile apps #design #ui #mobile',
    timeAgo: '2h ago',
    likes: 23,
    comments: 1,
    hasImages: true,
    images: [
         'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&auto=format&fit=crop',
         'https://images.unsplash.com/photo-1586717791821-3f44a5638d48?w=600&auto=format&fit=crop'
    ],
    commentsList: [
        { id: 101, author: 'Mike Ross', content: 'Love the color palette!', time: '1h' }
    ]
  },
];

export default function PostFeed() {
  const [posts, setPosts] = React.useState(initialPosts);
  const [likedPosts, setLikedPosts] = React.useState<Set<number>>(new Set());
  const [openComments, setOpenComments] = React.useState<Set<number>>(new Set());
  const [commentInputs, setCommentInputs] = React.useState<Record<number, string>>({});

  const handleLike = (postId: number) => {
    setLikedPosts((prev) => {
      const newSet = new Set(prev);
      const isLiked = newSet.has(postId);
      
      // Update post likes count
      setPosts(posts.map(p => {
          if (p.id === postId) {
              return { ...p, likes: isLiked ? p.likes - 1 : p.likes + 1 };
          }
          return p;
      }));
      
      if (isLiked) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const toggleComments = (postId: number) => {
      setOpenComments(prev => {
          const newSet = new Set(prev);
          if (newSet.has(postId)) {
              newSet.delete(postId);
          } else {
              newSet.add(postId);
          }
          return newSet;
      });
  };

  const handleCommentChange = (postId: number, value: string) => {
      setCommentInputs(prev => ({ ...prev, [postId]: value }));
  };

  const submitComment = (postId: number) => {
      const content = commentInputs[postId];
      if (!content?.trim()) return;

      setPosts(posts.map(p => {
          if (p.id === postId) {
              const newComment = {
                  id: Date.now(),
                  author: 'You', // In real app, get from auth context
                  content: content,
                  time: 'Just now'
              };
              return { 
                  ...p, 
                  comments: p.comments + 1,
                  commentsList: [...(p.commentsList || []), newComment]
              };
          }
          return p;
      }));
      
      // Clear input
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
  };

  return (
    <div className="space-y-6">
       <div className="space-y-6">
        {posts.map((post) => (
          <div key={post.id} className="bg-white rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <Avatar className="h-[40px] w-[40px]">
                <AvatarImage src={post.author.avatar} />
                <AvatarFallback>{post.author.fallback}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <p className="text-[0.75rem] text-[#959595]">
                    posted by{' '}
                    <span className="font-medium text-[0.75rem] text-[#959595] ">
                      {post.author.name}
                    </span>
                  </p>
                  <p className="text-[0.75rem] text-[#959595]">
                    {post.timeAgo}
                  </p>
                </div>
                <h3 className="font-bold text-[1rem] text-[#000000] mb-2">
                  {post.group}
                </h3>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-gray-700 mb-3">
                {post.content.split(' ').map((word, index) => {
                  if (word.startsWith('#')) {
                    return (
                      <span
                        key={index}
                        className="text-[#0E9DA5] cursor-pointer"
                      >
                        {word}{' '}
                      </span>
                    );
                  }
                  return word + ' ';
                })}
              </p>

              {post.hasImages && post.images && (
                <div className={`grid gap-2 mb-4 ${post.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {post.images.map((img, idx) => (
                      <div key={idx} className="bg-gray-200 rounded-lg h-[259px] overflow-hidden">
                           <img src={img} alt="Post content" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                      </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4 mb-4">
              <button 
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center space-x-1 ${likedPosts.has(post.id) ? 'text-[#EB4335]' : 'text-gray-500'} hover:text-[#EB4335] transition-colors`}
              >
                <Heart
                  className={`w-4 h-4 ${likedPosts.has(post.id) ? 'fill-current' : ''}`}
                />
                <span className="text-sm">{post.likes} Likes</span>
              </button>
              <button 
                  onClick={() => toggleComments(post.id)}
                  className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors"
                >
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm">{post.comments} comments</span>
              </button>
              <button className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors">
                <Share2 className="w-4 h-4" />
                <span className="text-sm">Share</span>
              </button>
            </div>

            {/* Comment Section - Input always visible or just on click? User asked to enable comment functionalities. */}
            {/* Let's show input always, and list if toggled */}
            <div className="pt-3 border-t border-gray-100">
                {openComments.has(post.id) && post.commentsList && post.commentsList.length > 0 && (
                    <div className="space-y-3 mb-4 max-h-60 overflow-y-auto custom-scrollbar">
                        {post.commentsList.map((comment) => (
                            <div key={comment.id} className="flex gap-2">
                                <div className="bg-gray-50 rounded-lg p-2 flex-1">
                                    <div className="flex justify-between items-baseline">
                                        <span className="font-semibold text-xs text-gray-900">{comment.author}</span>
                                        <span className="text-[10px] text-gray-500">{comment.time}</span>
                                    </div>
                                    <p className="text-sm text-gray-700">{comment.content}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="flex items-center space-x-3">
                  <Avatar className="h-[32px] w-[32px]">
                    <AvatarImage src="/images/image.png" />
                    <AvatarFallback>Me</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 relative h-[40px]">
                    <Input
                      placeholder="Write a comment..."
                      className="bg-[#f5f5f5] text-gray-600 pr-20 rounded-full h-[40px] text-sm"
                      value={commentInputs[post.id] || ''}
                      onChange={(e) => handleCommentChange(post.id, e.target.value)}
                      onKeyDown={(e) => {
                          if (e.key === 'Enter') submitComment(post.id);
                      }}
                    />
    
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                      <button 
                          onClick={() => submitComment(post.id)}
                          disabled={!commentInputs[post.id]?.trim()}
                          className="text-xs font-semibold text-[#0E9DA5] disabled:opacity-50 hover:bg-gray-100 px-2 py-1 rounded"
                      >
                          Post
                      </button>
                    </div>
                  </div>
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
