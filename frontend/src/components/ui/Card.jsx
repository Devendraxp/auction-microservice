import React from 'react';

const Card = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
