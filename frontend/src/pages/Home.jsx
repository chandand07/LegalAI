import React, { useState, useEffect, useCallback } from 'react'
import Navbar from '../components/Navbar'
import DocumentViewer from '../components/DocumentViewer'
import FileUpload from '../components/FileUpload'
import Copilot from '../components/Copilot'
import Chatbot from '../components/Chatbot'
import debounce from 'lodash/debounce'

function Home() {
  const [document, setDocument] = useState('')
  const [summary, setSummary] = useState('')
  const [activeTab, setActiveTab] = useState('copilot')
  const [chatHistory, setChatHistory] = useState([])
  const [riskAnalysis, setRiskAnalysis] = useState(null)
  const [error, setError] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [legalAspects, setLegalAspects] = useState(null)

  const processDocument = useCallback(async (content) => {
    if (isProcessing) return
    setIsProcessing(true)
    try {
      setError(null)
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ document: content }),
      });
      if (!response.ok) {
        throw new Error('Failed to process document')
      }
      const data = await response.json();
      console.log('Processed document data:', data);
      setSummary(data.summary);
      setRiskAnalysis(data.riskAnalysis);
      setLegalAspects(data.legalAspects);
    } catch (error) {
      console.error('Error processing document:', error);
      setError('An error occurred while processing the document. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }, [isProcessing])

  const debouncedProcessDocument = useCallback(
    debounce((content) => processDocument(content), 1000),
    [processDocument]
  )

  const handleUpload = (content) => {
    setDocument(content)
    processDocument(content)
  }

  const handleDocumentChange = (newContent) => {
    setDocument(newContent)
    debouncedProcessDocument(newContent)
  }

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-3/5 flex flex-col">
          <DocumentViewer 
            content={document} 
            onContentChange={handleDocumentChange} 
            riskAnalysis={riskAnalysis}
          />
          <FileUpload onUpload={handleUpload} />
        </div>
        <div className="w-2/5 flex flex-col">
          <div className="flex border-b">
            <button
              className={`flex-1 py-2 ${activeTab === 'copilot' ? 'bg-white' : 'bg-gray-200'}`}
              onClick={() => setActiveTab('copilot')}
            >
              Copilot
            </button>
            <button
              className={`flex-1 py-2 ${activeTab === 'chatbot' ? 'bg-white' : 'bg-gray-200'}`}
              onClick={() => setActiveTab('chatbot')}
            >Chatbot</button>
            </div>
          <div className="flex-1 overflow-auto">
            {activeTab === 'copilot' ? (
              <Copilot summary={summary} riskAnalysis={riskAnalysis} legalAspects={legalAspects} document={document} />
            ) : (
              <Chatbot 
                documentContent={document} 
                chatHistory={chatHistory}
                setChatHistory={setChatHistory}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home