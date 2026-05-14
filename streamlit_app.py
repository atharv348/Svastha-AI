import requests
import streamlit as st


st.set_page_config(page_title="Pragyantra Streamlit", page_icon="+", layout="wide")

st.title("Pragyantra Local Streamlit")
st.caption("Lightweight local UI for backend health, login, chatbot, and diagnosis upload.")

default_backend = "http://127.0.0.1:8000"
backend_url = st.sidebar.text_input("Backend URL", value=default_backend).rstrip("/")

if "token" not in st.session_state:
    st.session_state.token = ""


def api_headers() -> dict:
    headers = {}
    if st.session_state.token:
        headers["Authorization"] = f"Bearer {st.session_state.token}"
    return headers


col1, col2 = st.columns(2)

with col1:
    st.subheader("Backend Health")
    if st.button("Check /health"):
        try:
            resp = requests.get(f"{backend_url}/health", timeout=20)
            st.success(f"HTTP {resp.status_code}: {resp.text}")
        except Exception as exc:
            st.error(f"Health check failed: {exc}")

with col2:
    st.subheader("Login")
    username = st.text_input("Username", value="admin")
    password = st.text_input("Password", type="password", value="admin123")
    if st.button("Login (/token)"):
        try:
            resp = requests.post(
                f"{backend_url}/token",
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                data={"username": username, "password": password},
                timeout=30,
            )
            if resp.ok:
                data = resp.json()
                st.session_state.token = data.get("access_token", "")
                st.success("Login successful")
            else:
                st.error(f"Login failed: HTTP {resp.status_code} - {resp.text}")
        except Exception as exc:
            st.error(f"Login request failed: {exc}")


st.divider()

tab1, tab2 = st.tabs(["AI Coach", "AI Diagnosis"])

with tab1:
    st.subheader("Coach Chat")
    prompt = st.text_area("Message", value="hello", height=120)
    if st.button("Send to /coach/chat"):
        if not st.session_state.token:
            st.warning("Login first to get a token.")
        else:
            try:
                resp = requests.post(
                    f"{backend_url}/coach/chat",
                    json={"prompt": prompt},
                    headers={**api_headers(), "Content-Type": "application/json"},
                    timeout=60,
                )
                if resp.ok:
                    st.success("Response received")
                    st.write(resp.json().get("response", ""))
                else:
                    st.error(f"Coach error: HTTP {resp.status_code} - {resp.text}")
            except Exception as exc:
                st.error(f"Coach request failed: {exc}")

with tab2:
    st.subheader("Diagnosis Upload")
    body_part = st.selectbox("Body Part", ["skin", "eye", "oral", "bone", "lungs", "muac"])
    image = st.file_uploader("Upload image", type=["jpg", "jpeg", "png", "webp"])
    if st.button("Run /predictions/predict"):
        if not st.session_state.token:
            st.warning("Login first to get a token.")
        elif image is None:
            st.warning("Please upload an image.")
        else:
            try:
                files = {"file": (image.name, image.getvalue(), image.type or "image/jpeg")}
                data = {"body_part": body_part}
                resp = requests.post(
                    f"{backend_url}/predictions/predict",
                    params={"body_part": body_part},
                    files=files,
                    data=data,
                    headers=api_headers(),
                    timeout=120,
                )
                if resp.ok:
                    st.success("Diagnosis completed")
                    st.json(resp.json())
                else:
                    st.error(f"Diagnosis error: HTTP {resp.status_code} - {resp.text}")
            except Exception as exc:
                st.error(f"Diagnosis request failed: {exc}")
