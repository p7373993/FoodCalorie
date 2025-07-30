import React, { useState, useEffect } from 'react';

interface WeightRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (weight: string) => void;
}

const WeightRecordModal: React.FC<WeightRecordModalProps> = ({ isOpen, onClose, onSave }) => {
  const [weight, setWeight] = useState('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (weight) {
      onSave(weight);
      setWeight('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center z-50 animate-fade-in pt-20">
      <div className="w-full max-w-sm bg-gray-800 border border-gray-600 rounded-2xl p-6 space-y-4 relative mx-4 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-700 transition-colors z-10"
          aria-label="닫기"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold text-center text-white">오늘의 체중 기록</h2>
        <p className="text-sm text-gray-300 text-center">오늘의 체중(kg)을 입력해주세요.</p>

        <input
          type="number"
          placeholder="체중을 입력하세요"
          value={weight}
          onChange={e => setWeight(e.target.value)}
          className="w-full bg-gray-900 border border-gray-600 p-3 rounded-md text-center text-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
        />

        <div className="grid grid-cols-2 gap-4 pt-2">
          <button
            onClick={onClose}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition-colors"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeightRecordModal;