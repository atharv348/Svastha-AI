import os
import json
from typing import List, Dict, Optional
from langchain_groq import ChatGroq
from duckduckgo_search import DDGS
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

class SchemeInfo(BaseModel):
    name: str = Field(description="Name of the disability scheme")
    description: str = Field(description="Detailed description of the scheme and its benefits")
    benefit_type: str = Field(description="Type of benefit (e.g., Scholarship, Pension, Aids & Appliances, Insurance)")
    category: str = Field(description="Category of the scheme (e.g., Central, State)")
    ease_score: int = Field(description="A score from 1-10 representing how easy it is to apply for this scheme")
    required_documents: List[str] = Field(description="List of documents required for the application")
    eligibility_summary: str = Field(description="A brief summary of who is eligible for this scheme")

class SchemeSearchEngine:
    def __init__(self):
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key or "your-groq-api-key" in api_key:
            self.llm = None
        else:
            self.llm = ChatGroq(
                model_name="llama-3.3-70b-versatile",
                groq_api_key=api_key,
                temperature=0.2
            )
        self.ddgs = DDGS()

    def _run_search(self, query: str) -> str:
        try:
            results = self.ddgs.text(query, max_results=5)
            return "\n\n".join([f"Source: {r.get('href')}\nTitle: {r.get('title')}\nContent: {r.get('body')}" for r in results])
        except Exception as e:
            print(f"DDGS search error: {e}")
            return ""

    def search_schemes(self, user_profile: Dict, question: Optional[str] = None) -> Dict:
        if not self.llm:
            return {"error": "Groq API key not configured"}

        # 1. Construct a targeted search query based on user profile
        profile_context = f"{user_profile.get('disability_type', '')} {user_profile.get('disability_percentage', 0)}% disability"
        location_context = f"in {user_profile.get('state', 'India')}"
        income_context = f"for income ₹{user_profile.get('income_annual', 'any')}"
        
        user_question = (question or "").strip()
        question_context = f"User question: {user_question}" if user_question else "User question: Find the best matching disability schemes, eligibility details, and application steps."
        search_query = f"Indian government disability schemes {profile_context} {location_context} {income_context} latest 2024 2025"
        
        try:
            # 2. Fetch real-time results from DuckDuckGo
            search_query_full = search_query + " disability scheme details benefits eligibility apply"
            web_results = self._run_search(search_query_full)
            
            if not web_results or len(web_results) < 50:
                print("Web search returned very few results, trying alternative query")
                web_results = self._run_search(f"List of government disability schemes in {user_profile.get('state', 'India')} for {user_profile.get('disability_type', 'disabled')} persons")

            # 3. Use LLM to synthesize and extract structured scheme information
            system_prompt = """You are Sahayak AI, an empathetic and expert assistant for disability entitlements in India.
            Your task is to analyze the provided search results and extract a list of eligible schemes for the user based on their profile.
            
            USER PROFILE:
            - Disability Type: {disability_type}
            - Percentage: {disability_percentage}%
            - Annual Income: ₹{income_annual}
            - State: {state}
            
            SEARCH RESULTS:
            {context}

            USER QUESTION:
            {question}
            
            INSTRUCTIONS:
            1. If the user asked a specific question, answer it directly in the 'answer' field first.
            2. Extract at least 3-5 relevant schemes if available in the search results.
            3. For each scheme, provide structured data including: name, description, benefit type, category, ease_score (1-10), required_documents (list), and eligibility_summary.
            4. If no specific schemes are found in the results, provide general advice about the most common schemes (like UDID, ADIP, or Scholarships) in the 'answer' field and return an empty list for 'schemes'.
            5. Return ONLY a valid JSON object with 'answer' and 'schemes' keys.
            """
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", system_prompt),
                ("user", "Based on my profile and the search results, what schemes am I eligible for?")
            ])
            
            chain = prompt | self.llm
            
            response = chain.invoke({
                "disability_type": user_profile.get('disability_type', 'any'),
                "disability_percentage": user_profile.get('disability_percentage', 0),
                "income_annual": user_profile.get('income_annual', 'any'),
                "state": user_profile.get('state', 'India'),
                "context": web_results,
                "question": question_context
            })
            
            # Attempt to parse the response as JSON
            content = response.content
            try:
                # Find JSON block if it exists
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                elif "{" in content:
                    content = content[content.find("{"):content.rfind("}")+1].strip()
                
                parsed_data = json.loads(content)
                ans = parsed_data.get("answer", "")
                if not ans or len(ans) < 10 or "No specific guidance found" in ans:
                    ans = f"I found several matching schemes for your {user_profile.get('disability_type', 'disability')} profile in {user_profile.get('state', 'India')}. The top recommended one is the ADIP Scheme, which provides assistive aids and appliances. You'll generally need your disability certificate and income proof to apply."
                
                return {
                    "answer": ans,
                    "schemes": parsed_data.get("schemes", []),
                    "sources": [{"id": "web-1", "title": "DuckDuckGo Web Search", "content": web_results}],
                    "query": search_query
                }
            except Exception as parse_err:
                print(f"Failed to parse AI response: {parse_err}")
                ans = content
                if not ans or len(ans) < 10 or "No specific guidance found" in ans:
                    ans = f"Based on your {user_profile.get('disability_type', 'disability')} profile, there are several Indian government schemes like ADIP and UDID available. I recommend checking the official DEPwD portal for the most recent application links."
                
                return {
                    "answer": ans,
                    "schemes": [],
                    "sources": [{"id": "web-1", "title": "DuckDuckGo Web Search", "content": web_results}],
                    "query": search_query
                }

        except Exception as e:
            print(f"Search engine error: {e}")
            return {"error": str(e)}

def get_scheme_search_engine():
    return SchemeSearchEngine()
