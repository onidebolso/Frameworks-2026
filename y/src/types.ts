export interface LayoutProps {
  title: string;
}

export interface ArticleProps {
  post: {
    data: {
      title: string;
      author?: string;
      tags?: string[];
      date?: Date;
    };
    Content: any;
  };
}