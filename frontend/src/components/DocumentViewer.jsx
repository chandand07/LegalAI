import React, { useEffect, useRef, useState } from 'react'
import { Tooltip } from 'react-tooltip'

const riskColors = {
  high: 'bg-red-200',
  medium: 'bg-yellow-200',
  low: 'bg-green-200',
};

function DocumentViewer({ content, onContentChange, riskAnalysis }) {
  const editorRef = useRef(null);
  const [highlightedContent, setHighlightedContent] = useState(content);

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*');
  }  

  useEffect(() => {
    if (riskAnalysis && content && typeof content === 'string') {
      let newContent = content;
      let tooltipId = 0;
  
      Object.entries(riskAnalysis).forEach(([riskLevel, risks]) => {
        if (Array.isArray(risks)) {
          risks.forEach(risk => {
            if (risk && risk.text) {
              const escapedText = escapeRegExp(risk.text);
              const regex = new RegExp(`(${escapedText})`, 'gi');
              tooltipId++;
              newContent = newContent.replace(regex, (match) => 
                `<span class="${riskColors[riskLevel]} cursor-help" data-tooltip-id="tooltip-${tooltipId}" data-tooltip-content="${risk.explanation}">${match}</span>`
              );
            }
          });
        }
      });
  
      setHighlightedContent(newContent);
    } else {
      setHighlightedContent(content);
    }
  }, [content, riskAnalysis]);  

  const handleInput = (e) => {
    onContentChange(e.target.innerText);
  };

  return (
    <div className="flex-1 p-4 overflow-auto bg-white border border-gray-300">
      <div
        ref={editorRef}
        className="whitespace-pre-wrap outline-none"
        contentEditable
        onInput={handleInput}
        dangerouslySetInnerHTML={{ __html: highlightedContent || 'No document loaded' }}
      />
      {riskAnalysis && Object.values(riskAnalysis).flat().map((risk, index) => (
        risk && risk.explanation && <Tooltip key={index} id={`tooltip-${index + 1}`} />
      ))}
    </div>
  );  
}

export default DocumentViewer