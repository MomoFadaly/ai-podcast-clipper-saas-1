export interface LayoutDimensions {
  width: number;
  height: number;
}

export interface LayoutPanel {
  id: string;
  type: string;
  size?: number;
  children?: LayoutPanel[];
}

export interface LayoutPreset {
  id: string;
  name: string;
  description?: string;
  layout: LayoutPanel;
  dimensions?: LayoutDimensions;
}

export interface DockZone {
  id: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  panels: LayoutPanel[];
}

export interface PanelGroup {
  id: string;
  orientation: 'horizontal' | 'vertical';
  panels: LayoutPanel[];
}