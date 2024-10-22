import React, { useState } from 'react';

function FileUpload({ onUpload }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpload(text);
    setText('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (data.text) {
          setText(data.text);
          onUpload(data.text);
        }
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-gray-100">
      <textarea
        className="w-full p-2 border border-gray-300 rounded"
        rows="4"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste your document here..."
      ></textarea>
      <div className="mt-2 flex justify-between items-center">
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          className="text-sm"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Submit
        </button>
      </div>
    </form>
  );
}

export default FileUpload;