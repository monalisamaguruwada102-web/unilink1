import { Heart, MessageSquare } from 'lucide-react';

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string | null;
  created_at: string;
  users?: {
    name: string;
    avatar_url: string;
  };
  _count?: {
    likes?: number;
    comments?: number;
  };
}

interface PostCardProps {
  post: Post;
  onLike?: (id: string) => void;
  onComment?: (id: string) => void;
}

export default function PostCard({ post, onLike, onComment }: PostCardProps) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
      <div className="flex items-center gap-3 mb-3">
        {post.users?.avatar_url ? (
          <img
            src={post.users.avatar_url}
            alt={post.users.name}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold">
            {post.users?.name?.charAt(0) || 'U'}
          </div>
        )}
        <div>
          <h4 className="font-semibold text-gray-900">{post.users?.name || 'Unknown User'}</h4>
          <span className="text-xs text-gray-500">
            {new Date(post.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
      
      <p className="text-gray-800 mb-3 whitespace-pre-wrap">{post.content}</p>
      
      {post.image_url && (
        <img
          src={post.image_url}
          alt="Post content"
          className="w-full rounded-lg object-cover max-h-80 mb-3"
        />
      )}
      
      <div className="flex items-center gap-6 border-t border-gray-100 pt-3 text-gray-500">
        <button
          onClick={() => onLike && onLike(post.id)}
          className="flex items-center gap-1.5 hover:text-primary-600 transition"
        >
          <Heart size={20} />
          <span className="text-sm font-medium">{post._count?.likes || 0}</span>
        </button>
        <button
          onClick={() => onComment && onComment(post.id)}
          className="flex items-center gap-1.5 hover:text-blue-600 transition"
        >
          <MessageSquare size={20} />
          <span className="text-sm font-medium">{post._count?.comments || 0}</span>
        </button>
      </div>
    </div>
  );
}
