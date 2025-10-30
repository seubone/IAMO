import { useState, useEffect } from 'react';

const SIDEBAR_STORAGE_KEY = 'chat-sidebar-width';
const MIN_WIDTH = 250; // Largura mínima da sidebar (px)
const MAX_WIDTH = 600; // Largura máxima da sidebar (px)
const DEFAULT_WIDTH = 400; // Largura padrão (px)

export function useSidebarWidth() {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);

  // Carregar largura salva do localStorage
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved) {
      const width = parseInt(saved, 10);
      if (width >= MIN_WIDTH && width <= MAX_WIDTH) {
        setSidebarWidth(width);
      }
    }
  }, []);

  // Salvar largura no localStorage
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  // Gerenciar redimensionamento
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = e.clientX;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return {
    sidebarWidth,
    isResizing,
    setIsResizing,
    MIN_WIDTH,
    MAX_WIDTH,
    DEFAULT_WIDTH,
  };
}
