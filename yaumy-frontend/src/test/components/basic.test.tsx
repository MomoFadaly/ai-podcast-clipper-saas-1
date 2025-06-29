/**
 * Basic Component Tests
 * Tests fundamental React component behavior
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

// Simple test component
const TestComponent = ({ message }: { message: string }) => {
  return <div data-testid="test-message">{message}</div>;
};

describe('Basic Component Tests', () => {
  it('should render component with message', () => {
    const message = 'Hello, Testing!';
    render(<TestComponent message={message} />);
    
    const element = document.querySelector('[data-testid="test-message"]');
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent(message);
  });

  it('should handle empty message', () => {
    render(<TestComponent message="" />);
    
    const element = document.querySelector('[data-testid="test-message"]');
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('');
  });

  it('should handle special characters', () => {
    const specialMessage = 'Test with éñçødîñg & symbols!';
    render(<TestComponent message={specialMessage} />);
    
    const element = document.querySelector('[data-testid="test-message"]');
    expect(element).toHaveTextContent(specialMessage);
  });
});