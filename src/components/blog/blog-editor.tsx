'use client';

import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { all, createLowlight } from 'lowlight';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect } from 'react';
import { BlogEditorToolbar } from './blog-editor-toolbar';

const lowlight = createLowlight(all);

export interface BlogEditorProps {
  content?: string;
  onChange?: (json: string, html: string) => void;
  placeholder?: string;
}

export function BlogEditor({ content, onChange, placeholder }: BlogEditorProps) {
  const t = useTranslations('blogAdmin.editor');
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Placeholder.configure({
        placeholder: placeholder || t('contentPlaceholder'),
      }),
      Highlight,
      Typography,
    ],
    content: content ? JSON.parse(content) : undefined,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose-base dark:prose-invert max-w-none min-h-[400px] focus:outline-none px-4 py-3',
      },
    },
    onUpdate: ({ editor }) => {
      const json = JSON.stringify(editor.getJSON());
      const html = editor.getHTML();
      onChange?.(json, html);
    },
    immediatelyRender: false,
  });

  // Update content when prop changes externally (e.g., loading from DB)
  useEffect(() => {
    if (editor && content) {
      const currentJson = JSON.stringify(editor.getJSON());
      if (currentJson !== content) {
        try {
          editor.commands.setContent(JSON.parse(content));
        } catch {
          // ignore invalid JSON
        }
      }
    }
  }, [editor, content]);

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!editor) return;

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/blog/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Upload failed');
        }

        const data = await response.json();
        editor.chain().focus().setImage({ src: data.url }).run();
      } catch (error) {
        console.error('[blog-editor] image upload error:', error);
        throw error;
      }
    },
    [editor]
  );

  if (!editor) return null;

  return (
    <div className="rounded-lg border bg-background">
      <BlogEditorToolbar editor={editor} onImageUpload={handleImageUpload} />
      <EditorContent editor={editor} />
    </div>
  );
}
