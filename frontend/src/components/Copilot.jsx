import React, { useState } from 'react';
import { Tooltip } from 'react-tooltip';

const riskCategories = {
  high: { name: 'High Risk', color: 'bg-red-200' },
  medium: { name: 'Medium Risk', color: 'bg-yellow-200' },
  low: { name: 'Low Risk', color: 'bg-green-200' },
};

const legalAspectDefinitions = {
  irac: "Issue, Rule, Analysis, Conclusion",
  guidelines: "Relevant laws and regulations",
  consideration: "What each party gives or receives",
  parties: "Entities involved in the document",
  indemnity: "Protection against loss or damage",
  obligations: "Duties and responsibilities",
  jurisdiction: "Legal authority governing the document"
};

function Copilot({ summary, riskAnalysis, legalAspects, document }) {
  const [expanded, setExpanded] = useState(false);
  const [activeRiskCategory, setActiveRiskCategory] = useState(null);
  const [activeLegalAspect, setActiveLegalAspect] = useState(null);
  const [userTerms, setUserTerms] = useState('');
  const [termsViolation, setTermsViolation] = useState(null);

  const toggleExpand = () => setExpanded(!expanded);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  const checkUserTerms = async () => {
    try {
      const response = await fetch('/api/check-terms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ document, userTerms }),
      });
      const data = await response.json();
      setTermsViolation(data.result);
    } catch (error) {
      console.error('Error checking user terms:', error);
      setTermsViolation('An error occurred while checking the terms.');
    }
  };

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Copilot Summary</h2>
      <div className="prose max-w-none mb-4">
        {summary ? (
          <>
            <div dangerouslySetInnerHTML={{ 
              __html: expanded ? summary : `${summary.slice(0, 200)}...` 
            }} />
            {summary.length > 200 && (
              <button
                onClick={toggleExpand}
                className="mt-2 text-blue-500 hover:text-blue-700"
              >
                {expanded ? 'Read less' : 'Read more'}
              </button>
            )}
          </>
        ) : (
          <p>No summary available.</p>
        )}
      </div>

      {riskAnalysis && Object.keys(riskAnalysis).length > 0 && (
        <div className="mb-4">
          <h3 className="text-lg font-bold mb-2">Risk Analysis</h3>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {Object.entries(riskCategories).map(([key, { name, color }]) => (
              <button
                key={key}
                className={`px-3 py-1 rounded ${color} ${activeRiskCategory === key ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => setActiveRiskCategory(activeRiskCategory === key ? null : key)}
              >
                {name}
              </button>
            ))}
          </div>
          {activeRiskCategory && riskAnalysis[activeRiskCategory] && riskAnalysis[activeRiskCategory].length > 0 && (
            <div className="space-y-4">
              {riskAnalysis[activeRiskCategory].map((risk, index) => (
                <div key={index} className="bg-gray-100 p-3 rounded relative">
                  <button
                    onClick={() => handleCopy(risk.replacement)}
                    className="absolute top-2 right-2 text-blue-500 hover:text-blue-700"
                  >
                    Copy
                  </button>
                  <p className="font-semibold mb-2">Original Text:</p>
                  <p className="mb-2">{risk.text}</p>
                  <p className="font-semibold mb-2">Suggested Replacement:</p>
                  <p>{risk.replacement}</p>
                  <Tooltip id={`risk-tooltip-${index}`} />
                  <span 
                    data-tooltip-id={`risk-tooltip-${index}`}
                    data-tooltip-content={risk.explanation}
                    className="absolute bottom-2 right-2 text-blue-500 cursor-help"
                  >
                    ℹ️
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {legalAspects && Object.keys(legalAspects).length > 0 && (
        <div>
          <h3 className="text-lg font-bold mb-2">Legal Aspects</h3>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {Object.keys(legalAspects).map((aspect) => (
              <button
                key={aspect}
                className={`px-3 py-1 rounded ${activeLegalAspect === aspect ? 'bg-blue-200' : 'bg-gray-200'}`}
                onClick={() => setActiveLegalAspect(activeLegalAspect === aspect ? null : aspect)}
                data-tooltip-id={`tooltip-${aspect}`}
                data-tooltip-content={legalAspectDefinitions[aspect]}
              >
                {aspect.charAt(0).toUpperCase() + aspect.slice(1)}
              </button>
            ))}
          </div>
          {activeLegalAspect && (
            <div className="bg-gray-100 p-3 rounded">
              <h4 className="font-semibold mb-2">{activeLegalAspect.charAt(0).toUpperCase() + activeLegalAspect.slice(1)}</h4>
              <div dangerouslySetInnerHTML={{ __html: legalAspects[activeLegalAspect] }} />
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        <h3 className="text-lg font-bold mb-2">Check User Terms</h3>
        <div className="flex items-center">
          <input
            type="text"
            value={userTerms}
            onChange={(e) => setUserTerms(e.target.value)}
            className="flex-grow p-2 border rounded-l"
            placeholder="Enter terms to check..."
          />
          <button
            onClick={checkUserTerms}
            className="bg-blue-500 text-white p-2 rounded-r"
          >
            Check
          </button>
        </div>
        {termsViolation && (
          <div className="mt-2 p-3 bg-yellow-100 rounded">
            <p className="font-semibold">Result:</p>
            <p>{termsViolation}</p>
          </div>
        )}
      </div>

      {Object.keys(legalAspectDefinitions).map((aspect) => (
        <Tooltip key={aspect} id={`tooltip-${aspect}`} />
      ))}
    </div>
  );
}

export default Copilot;