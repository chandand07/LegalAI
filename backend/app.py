import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import google.generativeai as genai
import PyPDF2
import io
import re
import logging
import json

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}})

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel('gemini-pro')


def beautify_output(text):
    text = re.sub(r'^# (.*?)$', r'<h1>\1</h1>', text, flags=re.MULTILINE)
    text = re.sub(r'^## (.*?)$', r'<h2>\1</h2>', text, flags=re.MULTILINE)
    text = re.sub(r'^### (.*?)$', r'<h3>\1</h3>', text, flags=re.MULTILINE)

    text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', text)

    text = re.sub(r'^\s*[-*]\s*(.*?)$', r'<li>\1</li>', text, flags=re.MULTILINE)
    text = re.sub(r'(<li>.*?</li>)', r'<ul>\1</ul>', text, flags=re.DOTALL)

    text = re.sub(r'(?<!>)\n(?!<)', '<br>', text)

    return text

def analyze_risks(document):
    prompt = f"""
    Analyze the following legal document for potential risks. Categorize each risk as high, medium, or low.
    For each risk, provide the relevant text, its category, an explanation, and a suggested replacement.
    If no replacement is possible or necessary, provide a reason why instead of using "N/A".

    Document:
    {document}

    Format the output as a JSON object with the following structure:
    {{
        "high": [
            {{
                "text": "relevant text",
                "explanation": "why this is a high risk",
                "replacement": "suggested replacement text or explanation why no replacement is provided"
            }}
        ],
        "medium": [
            {{
                "text": "relevant text",
                "explanation": "why this is a medium risk",
                "replacement": "suggested replacement text or explanation why no replacement is provided"
            }}
        ],
        "low": [
            {{
                "text": "relevant text",
                "explanation": "why this is a low risk",
                "replacement": "suggested replacement text or explanation why no replacement is provided"
            }}
        ]
    }}
    Ensure that each risk has a meaningful replacement or explanation. Do not use "N/A" or null values.
    """
    try:
        response = model.generate_content(prompt)
        logger.info(f"Raw response from Gemini: {response.text}")
        
        try:
            risk_analysis = json.loads(response.text)
        except json.JSONDecodeError:
            match = re.search(r'\{.*\}', response.text, re.DOTALL)
            if match:
                risk_analysis = json.loads(match.group(0))
            else:
                logger.error("Failed to extract JSON from response")
                risk_analysis = {"high": [], "medium": [], "low": []}
        
        for risk_level in risk_analysis:
            risk_analysis[risk_level] = [risk for risk in risk_analysis[risk_level] if risk['replacement'] not in ["N/A", ""]]
        
        return risk_analysis
    except Exception as e:
        logger.error(f"Error in analyze_risks: {str(e)}")
        return {"high": [], "medium": [], "low": []}

def analyze_legal_aspects(document):
    prompt = f"""
    Analyze the following legal document and provide detailed information on these aspects:
    1. IRAC Analysis
    2. Guidelines or Governing Laws
    3. Consideration
    4. Parties
    5. Indemnity Clause
    6. Obligations
    7. Jurisdiction

    Document:
    {document}

    Provide a single string for each and every field, not an object for every field. think these terms as if you are a lawyer and a expert in the field of law.

    Format your response as a valid JSON object with the following structure:
    {{
        "irac": "IRAC analysis of the document. If not applicable, explain why.Provide a single string for each and every field, not an object",
        "guidelines": "Relevant guidelines or governing laws. If not mentioned, state that no specific guidelines are provided in the document.Provide a single string for each and every field, not an object",
        "consideration": "Details about the consideration in the document.Provide a single string for each and every field, not an object   ",
        "parties": "Details about the parties involved in the document.Provide a single string for each and every field, not an object",
        "indemnity": "Information about the indemnity clause. If not present, state that no indemnity clause is included in the document.Provide a single string for each and every field, not an object",
        "obligations": "Details about the obligations of the parties in the document.Provide a single string for each and every field, not an object",
        "jurisdiction": "Jurisdiction information from the document. If not specified, state that no jurisdiction is mentioned in the document.Provide a single string for each and every field, not an object"
    }}
    Ensure that the response is a valid JSON object. Do not use null values; instead, provide explanatory text for missing information.
    """
    try:
        response = model.generate_content(prompt)
        logger.info(f"Raw response from Gemini for legal aspects: {response.text}")
        
        cleaned_response = response.text.strip().strip('`').strip()
        
        if cleaned_response.lower().startswith('json'):
            cleaned_response = cleaned_response[4:].strip()
        
        try:
            legal_aspects = json.loads(cleaned_response)
        except json.JSONDecodeError as json_error:
            logger.error(f"JSON decode error: {str(json_error)}")
            logger.error(f"Problematic JSON: {cleaned_response}")
            legal_aspects = {}
        
        for key in legal_aspects:
            if isinstance(legal_aspects[key], str):
                legal_aspects[key] = beautify_output(legal_aspects[key])
            elif isinstance(legal_aspects[key], dict):
                for subkey in legal_aspects[key]:
                    if isinstance(legal_aspects[key][subkey], str):
                        legal_aspects[key][subkey] = beautify_output(legal_aspects[key][subkey])
        
        logger.info(f"Processed legal aspects: {legal_aspects}")
        return legal_aspects
    except Exception as e:
        logger.error(f"Error in analyze_legal_aspects: {str(e)}")
        return {}

@app.route('/api/upload', methods=['POST'])
def upload_document():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file and file.filename.endswith('.pdf'):
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file.read()))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return jsonify({"text": text})
    else:
        return jsonify({"error": "Invalid file type"}), 400

@app.route('/api/process', methods=['POST'])
def process_document():
    document = request.json.get('document', '')
    
    summary_prompt = f"""
    Summarize the following legal document, highlighting key points, important dates, amounts, and strong policies. 
    Use HTML tags for formatting.

    Document:
    {document}
    """

    try:
        document = request.json.get('document', '')
        if not document:
            return jsonify({"error": "No document provided"}), 400
        logger.info(f"Processing document of length: {len(document)}")
        
        summary_response = model.generate_content(summary_prompt)
        summary = beautify_output(summary_response.text)
        logger.info(f"Summary generated successfully")

        risk_analysis = analyze_risks(document)
        logger.info(f"Risk analysis completed: {risk_analysis}")

        legal_aspects = analyze_legal_aspects(document)
        logger.info(f"Legal aspects analyzed: {legal_aspects}")

        response_data = {
            "summary": summary,
            "riskAnalysis": risk_analysis,
            "legalAspects": legal_aspects
        }
        logger.info("Document processing completed successfully")
        return jsonify(response_data)
    except Exception as e:
        logger.error(f"Error in process_document: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred while processing the document"}), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    document = request.json.get('document', '')
    question = request.json.get('question', '')
    
    prompt = f"""
    Given the following legal document:

    {document}

    Please answer the following question:

    {question}

    Use markdown formatting for headers and bold text where appropriate.
    """

    try:
        response = model.generate_content(prompt)
        answer = beautify_output(response.text)
        return jsonify({"answer": answer})
    except Exception as e:
        print(f"Error generating response: {e}")
        return jsonify({"error": "An error occurred while processing your request"}), 500

@app.route('/api/check-terms', methods=['POST'])
def check_terms():
    document = request.json.get('document', '')
    user_terms = request.json.get('userTerms', '')
    
    prompt = f"""
    As a legal advisor, please analyze the following document and user terms:

    Document:
    {document}

    User Terms (things the user doesn't want in the document):
    {user_terms}

    Please check if there are any statements in the document that violate the user's terms. 
    Pay special attention to numerical values, dates, and specific phrases mentioned in the user terms.
    If there are violations, list them explicitly, quoting the relevant parts of the document.
    If there are no violations, state that the document complies with the user's terms.

    Format your response as follows:
    - If there are violations: "The following statements violate the user's terms: [List of violating statements with explanations]"
    - If there are no violations: "The document complies with the user's terms."

    Provide a detailed explanation for each violation or compliance, referencing specific parts of the document and user terms.
    """

    try:
        response = model.generate_content(prompt)
        return jsonify({"result": response.text})
    except Exception as e:
        print(f"Error checking user terms: {e}")
        return jsonify({"error": "An error occurred while checking the terms"}), 500

if __name__ == '__main__':
    app.run(debug=True)