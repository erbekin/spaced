import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { type PostWithSpaceInfo } from "../types";
import { Link, useParams } from "react-router-dom";
import { dateTimeLocal } from "../utils";

type PostViewParams = {
  postId: string;
};


// If dateTimeLocal is in a utility file, import it here:
// import { dateTimeLocal } from '../utils/date';

export default function PostView() {
  const { postId } = useParams<PostViewParams>();
  const [post, setPost] = useState<PostWithSpaceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) return;

    // setLoading(true);
    fetch(`/api/posts/${postId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch post');
        return res.json();
      })
      .then((data) => {
        setPost(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [postId]);

  return (
    <div className="w-full border border-gray-200 rounded-lg bg-white p-6 max-w-4xl mx-auto shadow-sm">
      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-sm">Error: {error}</p>
      ) : post ? (
        <article className="space-y-6">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
            <Link
              to={`/home/${post.space.owner.username}`}
              className="hover:text-gray-900 transition-colors font-medium"
            >
              @{post.space.owner.username}
            </Link>
            <span className="text-gray-400">/</span>
            <Link
              to={`/home/${post.space.owner.username}/spaces/${post.space.slug}`}
              className="hover:text-gray-900 transition-colors font-medium"
            >
              {post.space.slug}
            </Link>
          </nav>

          {/* Post Header */}
          <header className="border-b border-gray-100 pb-5">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight sm:text-3xl">
              {post.title}
            </h1>

            <div className="mt-2.5 flex items-center gap-2 text-xs text-gray-500">
              <span>
                By{' '}
                <span className="font-medium text-gray-700">
                  {post.space.owner.name || `@${post.space.owner.username}`}
                </span>
              </span>
              <span>•</span>
              <time dateTime={dateTimeLocal(post.createdAt, false)}>
                {dateTimeLocal(post.createdAt, false)}
              </time>
            </div>
          </header>

          {/* Post Content */}
          <div className="markdown-preview text-sm text-gray-800 leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content}
            </ReactMarkdown>
          </div>
        </article>
      ) : null}
    </div>
  );
}
