import React from 'react';

const Container = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Container;
