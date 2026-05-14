try:
    import duckduckgo_search
    print("duckduckgo_search imported successfully")
    from duckduckgo_search import DDGS
    print("DDGS imported successfully")
    from langchain_community.tools import DuckDuckGoSearchRun
    search = DuckDuckGoSearchRun()
    print("DuckDuckGoSearchRun initialized successfully")
except ImportError as e:
    print(f"ImportError: {e}")
except Exception as e:
    print(f"Error: {e}")
