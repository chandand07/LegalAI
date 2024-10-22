import React, { useState } from 'react';

function Chatbot({ documentContent, chatHistory, setChatHistory }) {
  const [input, setInput] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage = { text: input, sender: 'user' };
    setChatHistory([...chatHistory, newMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ document: documentContent, question: input }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      setChatHistory(prevMessages => [...prevMessages, { text: data.answer, sender: 'bot' }]);
    } catch (error) {
      console.error('Error chatting with AI:', error);
      setChatHistory(prevMessages => [...prevMessages, { text: 'Sorry, there was an error processing your request.', sender: 'bot' }]);
    }

    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {chatHistory.map((message, index) => (
          <div key={index} className={`${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
            <div 
              className={`inline-block p-2 rounded-lg ${message.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              dangerouslySetInnerHTML={{ __html: message.text }}
            />
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 p-2 border rounded-l-lg"
            placeholder="Ask a question about the document..."
          />
          <button type="submit" className="bg-blue-500 text-white p-2 rounded-r-lg">Send</button>
        </div>
      </form>
    </div>
  );
}

export default Chatbot;