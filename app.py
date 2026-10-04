from pathlib import Path
import streamlit as st
import streamlit.components.v1 as components

st.set_page_config(page_title="GridFlex | Neighbourhood Orchestrator",
                   page_icon="⚡", layout="wide",
                   initial_sidebar_state="collapsed")

# Remove Streamlit padding/header so the dashboard fills the page
st.markdown("""
<style>
  .block-container {padding:0 !important; max-width:100% !important;}
  header[data-testid="stHeader"], footer {display:none !important;}
</style>
""", unsafe_allow_html=True)

html_path = Path(__file__).parent / "build" / "index.html"
if not html_path.exists():
    st.error("build/index.html not found. Run `npm install && npm run build` and commit the build folder.")
    st.stop()

html = html_path.read_text(encoding="utf-8")

if hasattr(st, "iframe"):
    st.iframe(html, height=950)
else:
    components.html(html, height=950, scrolling=True)