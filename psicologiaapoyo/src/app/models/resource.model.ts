export type ResourceType = 'article' | 'exercise' | 'guide';

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  content: string;
  type: ResourceType;
  author_id: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}
