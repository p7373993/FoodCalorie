import React from 'react';

interface FormattedAiResponseProps {
  text: string;
}

const FormattedAiResponse: React.FC<FormattedAiResponseProps> = ({ text }) => {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
  return (
    <div className="space-y-3">
      {lines.map((line, index) => {
        if (line.startsWith('##')) {
          return (
            <h2 key={index} className="text-xl font-bold text-[var(--point-green)] pt-2">
              {line.replace('##', '').trim()}
            </h2>
          );
        }
        if (line.startsWith('###')) {
          return (
            <h3 key={index} className="text-lg font-bold text-[var(--point-green)] pt-2">
              {line.replace('###', '').trim()}
            </h3>
          );
        }
        if (line.startsWith('-')) {
          return (
            <p key={index} className="flex">
              <span className="mr-2 text-[var(--point-green)]">•</span>
              {line.replace('-', '').trim()}
            </p>
          );
        }
        if (line.includes('**')) {
          const parts = line.split('**');
          return (
            <p key={index}>
              {parts.map((part, i) => 
                i % 2 === 1 ? (
                  <strong key={i} className="font-bold text-white">{part}</strong>
                ) : (
                  part
                )
              )}
            </p>
          );
        }
        return <p key={index}>{line}</p>;
      })}
    </div>
  );
};

export default FormattedAiResponse;