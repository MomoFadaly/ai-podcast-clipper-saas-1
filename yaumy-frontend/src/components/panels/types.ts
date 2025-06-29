export interface Panel {
  id: string;
  type: string;
  title?: string;
  content?: any;
}

export interface PanelProps {
  panel: Panel;
  isActive?: boolean;
  onClose?: () => void;
}

export type PanelType = 'video' | 'transcript' | 'notes' | 'pdf' | 'empty';

export type ContentType = PanelType;

export interface ContentTypeDefinition {
  id: ContentType;
  label: string;
  icon?: any;
  component?: any;
}