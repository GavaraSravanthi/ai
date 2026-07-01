
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import os
import json
import re
from datetime import datetime
import google.generativeai as genai
load_dotenv()

app = Flask(__name__)
CORS(app)

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///study_plans.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(200), unique=True, nullable=False)
    password = db.Column(db.String(300), nullable=False)
    joined_at = db.Column(db.String(100), default=lambda: datetime.now().strftime("%Y-%m-%d"))
    avatar = db.Column(db.Text, nullable=True)


class StudyPlan(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    subjects = db.Column(db.String(300), nullable=False)
    hours = db.Column(db.String(50), nullable=False)
    weak_subjects = db.Column(db.String(300), nullable=False)
    exam_date = db.Column(db.String(100), nullable=False)
    plan = db.Column(db.Text, nullable=False)


class ChatSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    title = db.Column(db.String(200), nullable=False, default="New Chat")
    created_at = db.Column(db.String(100), default=lambda: datetime.now().strftime("%Y-%m-%d %H:%M"))
    updated_at = db.Column(db.String(100), default=lambda: datetime.now().strftime("%Y-%m-%d %H:%M"))


class ChatMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("chat_session.id"), nullable=False)
    sender = db.Column(db.String(20), nullable=False)
    text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.String(100), default=lambda: datetime.now().strftime("%Y-%m-%d %H:%M"))


class AIMemory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    memory_key = db.Column(db.String(120), nullable=False)
    memory_value = db.Column(db.Text, nullable=False)
    updated_at = db.Column(db.String(100), default=lambda: datetime.now().strftime("%Y-%m-%d %H:%M"))


with app.app_context():
    db.create_all()

    # Small SQLite migration for existing projects
    try:
        columns = [row[1] for row in db.session.execute(db.text("PRAGMA table_info(user)")).fetchall()]
        if "joined_at" not in columns:
            db.session.execute(db.text("ALTER TABLE user ADD COLUMN joined_at VARCHAR(100)"))
        if "avatar" not in columns:
            db.session.execute(db.text("ALTER TABLE user ADD COLUMN avatar TEXT"))
        db.session.execute(
            db.text("UPDATE user SET joined_at = :joined_at WHERE joined_at IS NULL OR joined_at = ''"),
            {"joined_at": datetime.now().strftime("%Y-%m-%d")}
        )
        db.session.commit()
    except Exception:
        db.session.rollback()


# ---------------- HELPERS ----------------

def get_available_model():
    try:
        models = client.models.list()
        for model in models:
            name = model.name.replace("models/", "")
            supported = getattr(model, "supported_actions", [])
            if "generateContent" in supported:
                return name
    except Exception:
        return None
    return None


def extract_json(text):
    if not text:
        return None

    try:
        return json.loads(text)
    except Exception:
        pass

    match = re.search(r"\[.*\]", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except Exception:
            pass
    return None


def calculate_days_left(exam_date):
    try:
        today = datetime.today().date()
        exam = datetime.strptime(exam_date, "%Y-%m-%d").date()
        days_left = (exam - today).days
        return days_left if days_left > 0 else 1
    except Exception:
        return 7


def normalize_subject_text(subject_text):
    """Convert subject input into clean tokens so shortcuts do not match inside other words.
    Example: OS,CN -> ["os", "cn"], not "c" inside "cn".
    """
    text = (subject_text or "").lower()
    text = re.sub(r"[^a-z0-9+]+", " ", text)
    tokens = [token.strip() for token in text.split() if token.strip()]
    return text, tokens


def get_subject_topics(subject_text):
    full_text, tokens = normalize_subject_text(subject_text)

    subject_map = {
        "Chemistry": {
            "keys": ["chem", "chemistry", "chm"],
            "phrases": ["chemical science"],
            "topics": [
                "Atomic Structure",
                "Chemical Bonding",
                "Periodic Table",
                "Stoichiometry",
                "Acids, Bases and Salts",
                "Organic Chemistry Basics",
                "Thermodynamics",
                "Chemical Equilibrium",
                "Electrochemistry",
                "Important Chemical Reactions",
            ],
        },
        "Physics": {
            "keys": ["phy", "physics", "phys"],
            "phrases": [],
            "topics": [
                "Units and Measurements",
                "Motion in a Straight Line",
                "Laws of Motion",
                "Work, Energy and Power",
                "Gravitation",
                "Waves",
                "Electricity",
                "Magnetism",
                "Optics",
                "Modern Physics",
            ],
        },
        "Python": {
            "keys": ["python", "py"],
            "phrases": ["python programming"],
            "topics": [
                "Python Basics",
                "Data Types",
                "Control Statements",
                "Functions",
                "Lists and Tuples",
                "Dictionaries",
                "Object Oriented Programming",
                "File Handling",
                "Modules",
                "Exception Handling",
            ],
        },
        "DBMS": {
            "keys": ["dbms", "database"],
            "phrases": ["database management system", "database management systems"],
            "topics": [
                "DBMS Introduction",
                "ER Model",
                "Relational Model",
                "SQL Queries",
                "Normalization",
                "Transactions",
                "Concurrency Control",
                "Indexing",
                "Joins",
                "Keys and Constraints",
            ],
        },
        "Artificial Intelligence": {
            "keys": ["ai"],
            "phrases": ["artificial intelligence"],
            "topics": [
                "AI Introduction",
                "Search Algorithms",
                "Knowledge Representation",
                "Machine Learning Basics",
                "Neural Networks",
                "Natural Language Processing",
                "Expert Systems",
                "AI Ethics",
                "Computer Vision",
                "AI Applications",
            ],
        },
        "Statistical Methods and Analysis": {
            "keys": ["sma", "stats", "statistics"],
            "phrases": ["statistical methods", "statistical methods and analysis"],
            "topics": [
                "Measures of Central Tendency",
                "Mean, Median and Mode",
                "Measures of Dispersion",
                "Standard Deviation",
                "Correlation",
                "Regression",
                "Probability",
                "Probability Distributions",
                "Sampling Methods",
                "Hypothesis Testing",
            ],
        },
        "Data Visualization": {
            "keys": ["dv", "viz"],
            "phrases": ["data visualization", "data visualisation", "data viz", "visualization", "visualisation"],
            "topics": [
                "Introduction to Data Visualization",
                "Types of Charts",
                "Bar Chart",
                "Pie Chart",
                "Line Chart",
                "Histogram",
                "Scatter Plot",
                "Dashboard Design",
                "Data Storytelling",
                "Visualization Best Practices",
            ],
        },
        "Operating Systems": {
            "keys": ["os"],
            "phrases": ["operating system", "operating systems"],
            "topics": [
                "OS Introduction",
                "Process Management",
                "CPU Scheduling",
                "Deadlocks",
                "Memory Management",
                "Paging",
                "Segmentation",
                "File System",
                "Synchronization",
            ],
        },
        "Computer Networks": {
            "keys": ["cn"],
            "phrases": ["computer network", "computer networks", "networking"],
            "topics": [
                "Network Basics",
                "OSI Model",
                "TCP/IP Model",
                "IP Addressing",
                "Routing",
                "Switching",
                "DNS",
                "HTTP and HTTPS",
                "Network Security",
            ],
        },
        "Data Structures and Algorithms": {
            "keys": ["dsa", "ds"],
            "phrases": ["data structures", "data structures and algorithms"],
            "topics": [
                "Arrays",
                "Linked Lists",
                "Stacks and Queues",
                "Trees",
                "Graphs",
                "Sorting Algorithms",
                "Searching Algorithms",
                "Recursion",
                "Dynamic Programming",
                "Time Complexity",
            ],
        },
        "Software Engineering": {
            "keys": ["se"],
            "phrases": ["software engineering"],
            "topics": [
                "Software Development Life Cycle",
                "Requirement Analysis",
                "Software Design",
                "UML Diagrams",
                "Testing Methods",
                "Agile Model",
                "Waterfall Model",
                "Project Management",
                "Software Maintenance",
            ],
        },
        "Java": {
            "keys": ["java"],
            "phrases": ["java programming"],
            "topics": [
                "Java Basics",
                "Classes and Objects",
                "Inheritance",
                "Polymorphism",
                "Abstraction",
                "Encapsulation",
                "Exception Handling",
                "Collections",
                "Multithreading",
                "JDBC Basics",
            ],
        },
        "C Programming": {
            "keys": ["c"],
            "phrases": ["c programming", "c language"],
            "topics": [
                "C Basics",
                "Data Types",
                "Operators",
                "Control Statements",
                "Functions",
                "Arrays",
                "Pointers",
                "Strings",
                "Structures",
                "File Handling",
            ],
        },
        "C++ Programming": {
            "keys": ["cpp", "c++"],
            "phrases": ["c plus plus", "c++ programming"],
            "topics": [
                "C++ Basics",
                "Classes and Objects",
                "Constructors",
                "Inheritance",
                "Polymorphism",
                "Templates",
                "STL",
                "Exception Handling",
                "File Handling",
            ],
        },
        "Machine Learning": {
            "keys": ["ml"],
            "phrases": ["machine learning"],
            "topics": [
                "ML Introduction",
                "Supervised Learning",
                "Unsupervised Learning",
                "Regression",
                "Classification",
                "Clustering",
                "Decision Trees",
                "Model Evaluation",
                "Overfitting and Underfitting",
            ],
        },
        "Web Development": {
            "keys": ["web", "wd"],
            "phrases": ["web development"],
            "topics": [
                "HTML Basics",
                "CSS Styling",
                "JavaScript Basics",
                "DOM Manipulation",
                "React Basics",
                "APIs",
                "Forms",
                "Responsive Design",
                "Frontend and Backend",
            ],
        },
    }

    matched_subjects = []
    seen = set()

    for subject, data in subject_map.items():
        matched = False

        # Exact token matching for shortcuts, so CN does not trigger C.
        for key in data["keys"]:
            if key in tokens:
                matched = True
                break

        # Phrase matching only for multi-word/full subject names.
        if not matched:
            for phrase in data.get("phrases", []):
                phrase_clean = re.sub(r"[^a-z0-9+]+", " ", phrase.lower()).strip()
                if phrase_clean and phrase_clean in full_text:
                    matched = True
                    break

        if matched and subject not in seen:
            matched_subjects.append((subject, data["topics"]))
            seen.add(subject)

    if matched_subjects:
        subject_names = ", ".join([item[0] for item in matched_subjects])
        topics = []
        for _, subject_topics in matched_subjects:
            topics.extend(subject_topics)
        return subject_names, topics

    clean_subject = subject_text or "General Subject"
    return clean_subject, [
        f"{clean_subject} basic concepts",
        f"{clean_subject} important definitions",
        f"{clean_subject} key topics",
        f"{clean_subject} practice questions",
        f"{clean_subject} revision",
    ]


def chemistry_quiz():
    return [
        {"question": "What is the atomic number of an element?", "options": ["Number of neutrons", "Number of protons", "Atomic mass", "Number of shells"], "answer": "Number of protons"},
        {"question": "Which bond is formed by sharing electrons?", "options": ["Ionic bond", "Covalent bond", "Metallic bond", "Hydrogen bond"], "answer": "Covalent bond"},
        {"question": "A solution with pH less than 7 is called?", "options": ["Basic", "Neutral", "Acidic", "Salt"], "answer": "Acidic"},
        {"question": "Which gas is released when an acid reacts with a metal?", "options": ["Oxygen", "Hydrogen", "Nitrogen", "Carbon dioxide"], "answer": "Hydrogen"},
        {"question": "What is Avogadro's number?", "options": ["6.022 × 10²³", "9.8", "3 × 10⁸", "1.6 × 10⁻¹⁹"], "answer": "6.022 × 10²³"},
        {"question": "What is the formula of water?", "options": ["CO2", "H2O", "NaCl", "O2"], "answer": "H2O"},
        {"question": "Which particle has negative charge?", "options": ["Proton", "Neutron", "Electron", "Nucleus"], "answer": "Electron"},
        {"question": "NaCl is commonly known as?", "options": ["Sugar", "Common salt", "Baking soda", "Vinegar"], "answer": "Common salt"},
        {"question": "What is oxidation?", "options": ["Gain of electrons", "Loss of electrons", "No electron change", "Only melting"], "answer": "Loss of electrons"},
        {"question": "Which branch studies carbon compounds?", "options": ["Organic chemistry", "Nuclear chemistry", "Physical geography", "Optics"], "answer": "Organic chemistry"},
    ]


def physics_quiz():
    return [
        {"question": "What is the SI unit of force?", "options": ["Joule", "Newton", "Watt", "Pascal"], "answer": "Newton"},
        {"question": "Acceleration due to gravity on Earth is approximately?", "options": ["9.8 m/s²", "3 m/s²", "10 km/s", "1 m/s²"], "answer": "9.8 m/s²"},
        {"question": "Which quantity is scalar?", "options": ["Velocity", "Force", "Speed", "Acceleration"], "answer": "Speed"},
        {"question": "What is the speed of light in vacuum?", "options": ["3 × 10⁸ m/s", "300 m/s", "9.8 m/s²", "1.6 × 10⁻¹⁹ C"], "answer": "3 × 10⁸ m/s"},
        {"question": "Ohm's law is represented by?", "options": ["V = IR", "F = ma", "P = VI²", "E = mc"], "answer": "V = IR"},
    ]


def chemistry_interview():
    return [
        {"question": "What is an atom?", "answer": "An atom is the smallest unit of an element that retains its chemical properties.", "tip": "Mention protons, neutrons, and electrons."},
        {"question": "What is a covalent bond?", "answer": "A covalent bond is formed when atoms share electrons.", "tip": "Give examples like H2, O2, or CH4."},
        {"question": "What is pH?", "answer": "pH is a scale used to measure acidity or basicity of a solution.", "tip": "Below 7 is acidic, 7 is neutral, above 7 is basic."},
        {"question": "What is oxidation?", "answer": "Oxidation is loss of electrons or addition of oxygen.", "tip": "Use OIL RIG: Oxidation Is Loss, Reduction Is Gain."},
        {"question": "What is Avogadro's number?", "answer": "It is 6.022 × 10²³ particles per mole.", "tip": "Connect it with the mole concept."},
        {"question": "What is the difference between acid and base?", "answer": "Acids donate H+ ions while bases accept H+ ions or donate OH- ions.", "tip": "Use examples like HCl and NaOH."},
        {"question": "What is organic chemistry?", "answer": "Organic chemistry is the study of carbon-containing compounds.", "tip": "Mention hydrocarbons and functional groups."},
        {"question": "What is a catalyst?", "answer": "A catalyst increases reaction rate without being consumed.", "tip": "Mention enzymes as biological catalysts."},
        {"question": "What is chemical equilibrium?", "answer": "It is a state where forward and backward reaction rates are equal.", "tip": "Mention dynamic equilibrium."},
        {"question": "What is electrochemistry?", "answer": "Electrochemistry studies the relation between chemical reactions and electrical energy.", "tip": "Give examples like batteries or electrolysis."},
    ]


def physics_interview():
    return [
        {"question": "State Newton's second law.", "answer": "Force equals mass times acceleration, F = ma.", "tip": "Explain with a real-life example."},
        {"question": "What is work in physics?", "answer": "Work is done when force causes displacement. W = F × s.", "tip": "Mention SI unit Joule."},
        {"question": "What is Ohm's law?", "answer": "Ohm's law states V = IR.", "tip": "Explain voltage, current, and resistance."},
        {"question": "What is kinetic energy?", "answer": "Energy possessed by a body due to motion. KE = 1/2 mv².", "tip": "Use correct formula."},
        {"question": "What is the speed of light?", "answer": "The speed of light in vacuum is 3 × 10⁸ m/s.", "tip": "Use SI unit."},
    ]



def user_to_dict(user):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "joinedAt": user.joined_at or datetime.now().strftime("%Y-%m-%d"),
        "avatar": user.avatar or "",
    }


def make_chat_title(message):
    words = re.sub(r"[^a-zA-Z0-9\s]", "", message or "").strip().split()
    title = " ".join(words[:5]) if words else "New Chat"
    return title[:60] or "New Chat"


def chat_session_to_dict(session):
    count = ChatMessage.query.filter_by(session_id=session.id).count()
    return {
        "id": session.id,
        "userId": session.user_id,
        "title": session.title,
        "createdAt": session.created_at,
        "updatedAt": session.updated_at,
        "messageCount": count,
    }


def chat_message_to_dict(message):
    return {
        "id": message.id,
        "sessionId": message.session_id,
        "sender": message.sender,
        "text": message.text,
        "createdAt": message.created_at,
    }


def memory_to_dict(memory):
    return {
        "id": memory.id,
        "userId": memory.user_id,
        "key": memory.memory_key,
        "value": memory.memory_value,
        "updatedAt": memory.updated_at,
    }


def set_user_memory(user_id, key, value):
    if not user_id or not key or not value:
        return

    key = key.strip().lower()
    value = value.strip()

    if not value:
        return

    memory = AIMemory.query.filter_by(user_id=user_id, memory_key=key).first()
    if not memory:
        memory = AIMemory(user_id=user_id, memory_key=key, memory_value=value)
        db.session.add(memory)
    else:
        memory.memory_value = value
        memory.updated_at = datetime.now().strftime("%Y-%m-%d %H:%M")


def get_user_memory_text(user_id):
    if not user_id:
        return "No saved memory yet."

    memories = AIMemory.query.filter_by(user_id=user_id).order_by(AIMemory.updated_at.desc()).all()
    if not memories:
        return "No saved memory yet."

    return "\n".join([f"- {m.memory_key}: {m.memory_value}" for m in memories])


def update_memory_from_message(user_id, message):
    if not user_id or not message:
        return []

    text = message.strip()
    lower = text.lower()
    saved = []

    # Explicit memory: "remember that my weak subject is DBMS"
    explicit = re.search(r"remember(?: that)? (.+)", text, re.IGNORECASE)
    if explicit:
        fact = explicit.group(1).strip().rstrip(".")
        set_user_memory(user_id, "remembered fact", fact)
        saved.append("remembered fact")

    # Subject preference / preparation subject
    subject_match = re.search(
        r"(?:i am|i'm|iam|im)?\s*(?:preparing|studying|learning|revising)\s+(?:for\s+)?([a-zA-Z0-9, &+.-]+)",
        lower,
        re.IGNORECASE,
    )
    if subject_match:
        subject_text = subject_match.group(1).strip()
        main_subject, _ = get_subject_topics(subject_text)
        set_user_memory(user_id, "current subject", main_subject)
        saved.append("current subject")

    weak_match = re.search(r"(?:my )?weak (?:subject|subjects|topic|topics)(?: is| are|:)?\s+([a-zA-Z0-9, &+.-]+)", lower, re.IGNORECASE)
    if weak_match:
        weak_text = weak_match.group(1).strip()
        main_subject, _ = get_subject_topics(weak_text)
        set_user_memory(user_id, "weak subject", main_subject)
        saved.append("weak subject")

    exam_match = re.search(r"(?:exam|test)(?: date)?(?: is| on|:)?\s+(\d{4}-\d{2}-\d{2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})", lower, re.IGNORECASE)
    if exam_match:
        set_user_memory(user_id, "exam date", exam_match.group(1))
        saved.append("exam date")

    role_match = re.search(r"(?:target role|role|job)(?: is|:)?\s+([a-zA-Z0-9, &+.-]+)", lower, re.IGNORECASE)
    if role_match:
        set_user_memory(user_id, "target role", role_match.group(1).strip())
        saved.append("target role")

    if any(word in lower for word in ["forget my memory", "clear memory", "delete memory", "forget everything"]):
        AIMemory.query.filter_by(user_id=user_id).delete()
        saved.append("cleared memory")

    if saved:
        db.session.commit()

    return saved

# ---------------- AUTH ROUTES ----------------

@app.route("/")
def home():
    return "AI Study Planner Backend Running"


@app.route("/register", methods=["POST"])
def register():
    data = request.json or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    if not name or not email or not password:
        return jsonify({"success": False, "message": "All fields are required"}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"success": False, "message": "Email already registered"}), 409

    new_user = User(
        name=name,
        email=email,
        password=generate_password_hash(password),
    )
    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Registration successful",
        "user": user_to_dict(new_user),
    })


@app.route("/login", methods=["POST"])
def login():
    data = request.json or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password, password):
        return jsonify({"success": False, "message": "Invalid email or password"}), 401

    return jsonify({
        "success": True,
        "message": "Login successful",
        "user": user_to_dict(user),
    })


@app.route("/profile/<int:user_id>", methods=["GET"])
def get_profile(user_id):
    user = User.query.get(user_id)

    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    return jsonify({"success": True, "user": user_to_dict(user)})


@app.route("/profile/<int:user_id>", methods=["PUT"])
def update_profile(user_id):
    user = User.query.get(user_id)

    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    data = request.json or {}
    name = data.get("name", "").strip()
    avatar = data.get("avatar", "")

    if not name:
        return jsonify({"success": False, "message": "Name is required"}), 400

    user.name = name
    user.avatar = avatar
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Profile updated successfully",
        "user": user_to_dict(user),
    })


# ---------------- AI ROUTES ----------------

@app.route("/generate-plan", methods=["POST"])
def generate_plan():
    data = request.json or {}

    subjects = data.get("subjects", "").strip()
    hours = data.get("hours", "").strip()
    weak_subjects = data.get("weakSubjects", "").strip()
    exam_date = data.get("examDate", "").strip()

    all_subject_text = f"{subjects} {weak_subjects}"
    main_subject, topics = get_subject_topics(all_subject_text)
    days_left = calculate_days_left(exam_date)

    prompt = f"""
You are an expert college study planner.

Create a personalized {days_left}-day study plan ONLY for this subject area:
{main_subject}

User entered subjects: {subjects}
Weak subjects: {weak_subjects}
Study hours per day: {hours}
Exam date: {exam_date}

STRICT RULES:
- Do NOT include unrelated subjects.
- If subject is Chemistry/chem, include chemistry topics only.
- If subject is Physics/phy, include physics topics only.
- If subject is DBMS, include DBMS topics only.
- If subject is Python, include Python topics only.
- Create Day 1 to Day {days_left}.
- Each day must include Topic, Study, Revision, Practice, and Quick Test.
- Focus more on weak subjects.
- Use simple college-student language.
"""

    try:
        model = get_available_model()
        if model:
            response = client.models.generate_content(model=model, contents=prompt)
            return jsonify({"plan": response.text, "daysLeft": days_left})
        raise Exception("No model available")

    except Exception:
        fallback_lines = f"""
AI Study Plan for {main_subject}

Subjects: {subjects}
Study Hours Per Day: {hours}
Weak Subjects: {weak_subjects}
Exam Date: {exam_date}
Total Days Available: {days_left}
"""
        for day in range(1, days_left + 1):
            topic = topics[(day - 1) % len(topics)]
            fallback_lines += f"""

Day {day}:
Topic: {topic}
Study: Learn the concept clearly with examples.
Revision: Revise previous notes for 20 minutes.
Practice: Solve 10 questions from {topic}.
Quick Test: Write short answers from {topic}.
"""
        return jsonify({"plan": fallback_lines, "daysLeft": days_left})


@app.route("/generate-quiz", methods=["POST"])
def generate_quiz():
    data = request.json or {}
    subject = data.get("subject", "").strip()
    main_subject, _ = get_subject_topics(subject)
    subject_lower = subject.lower()

    if "chem" in subject_lower:
        fallback_quiz = chemistry_quiz()
    elif "phy" in subject_lower or "physics" in subject_lower:
        fallback_quiz = physics_quiz()
    else:
        fallback_quiz = [
            {"question": f"What is an important way to learn {subject}?", "options": ["Only reading once", "Practice and revision", "Skipping basics", "Guessing answers"], "answer": "Practice and revision"},
            {"question": f"Why should students revise {subject} regularly?", "options": ["To improve memory", "To forget concepts", "To waste time", "To avoid exams"], "answer": "To improve memory"},
            {"question": f"What should you do after learning a {subject} topic?", "options": ["Practice questions", "Ignore it", "Delete notes", "Avoid revision"], "answer": "Practice questions"},
            {"question": f"What helps in understanding difficult {subject} topics?", "options": ["Short notes", "No practice", "Random guessing", "Skipping classes"], "answer": "Short notes"},
            {"question": f"What is useful before a {subject} exam?", "options": ["Mock test", "No revision", "Avoiding practice", "Sleeping all day"], "answer": "Mock test"},
        ]

    prompt = f"""
Create exactly 10 multiple choice questions ONLY on this subject:
{main_subject}

User typed: {subject}

STRICT RULES:
- Do not generate questions from any other subject.
- If subject is Chemistry/chem, generate chemistry questions only.
- If subject is Physics/phy, generate physics questions only.
- Return ONLY valid JSON array.
- No markdown.

Format:
[
  {{
    "question": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Correct option text"
  }}
]
"""

    try:
        model = get_available_model()
        if model:
            response = client.models.generate_content(model=model, contents=prompt)
            quiz_data = extract_json(response.text)
            if quiz_data:
                return jsonify({"quiz": quiz_data})
        return jsonify({"quiz": fallback_quiz})
    except Exception:
        return jsonify({"quiz": fallback_quiz})


@app.route("/generate-notes", methods=["POST"])
def generate_notes():
    data = request.json or {}
    subject = data.get("subject", "").strip()
    topic = data.get("topic", "").strip()
    main_subject, _ = get_subject_topics(subject)

    prompt = f"""
Create exam-friendly study notes ONLY for this subject:
{main_subject}

Topic: {topic}

Include:
- Definition
- Important concepts
- Key points
- Simple explanation
- Examples
- Exam tips
- 5 important questions
- Quick revision notes

Do not include unrelated subjects.
"""

    fallback_notes = f"""
AI Notes

Subject: {main_subject}
Topic: {topic}

Definition:
{topic} is an important topic in {main_subject}. It helps students understand core concepts and prepare for exams.

Important Concepts:
1. Learn the basic definition.
2. Understand the main purpose.
3. Practice examples.
4. Revise key points daily.
5. Solve previous questions.

Exam Tips:
- Focus on definitions.
- Practice diagrams or examples if needed.
- Attempt previous year questions.

Important Questions:
1. Define {topic}.
2. Explain the importance of {topic}.
3. Write short notes on {topic}.
4. Give examples of {topic}.
5. Explain advantages and disadvantages of {topic}.
"""

    try:
        model = get_available_model()
        if model:
            response = client.models.generate_content(model=model, contents=prompt)
            return jsonify({"notes": response.text})
        return jsonify({"notes": fallback_notes})
    except Exception:
        return jsonify({"notes": fallback_notes})


@app.route("/generate-flashcards", methods=["POST"])
def generate_flashcards():
    data = request.json or {}
    subject = data.get("subject", "").strip()
    topic = data.get("topic", "").strip()
    main_subject, _ = get_subject_topics(subject)

    fallback_flashcards = [
        {"question": f"What is {topic}?", "answer": f"{topic} is an important concept in {main_subject} used for exam preparation and understanding core ideas."},
        {"question": f"Why is {topic} important in {main_subject}?", "answer": "It helps students understand key concepts, solve problems, and answer exam questions clearly."},
        {"question": f"How should students study {topic}?", "answer": "Read definitions, understand examples, revise key points, and practice questions."},
        {"question": f"What is one exam tip for {topic}?", "answer": "Focus on definitions, examples, diagrams, and previous year questions."},
        {"question": f"What is the best revision method for {topic}?", "answer": "Use short notes, flashcards, mock questions, and daily revision."},
    ]

    prompt = f"""
Create exactly 10 flashcards ONLY for this subject:
{main_subject}

Topic: {topic}

Return ONLY valid JSON array.
No markdown.

Format:
[
  {{"question": "Question text", "answer": "Answer text"}}
]
"""

    try:
        model = get_available_model()
        if model:
            response = client.models.generate_content(model=model, contents=prompt)
            flashcards_data = extract_json(response.text)
            if flashcards_data:
                return jsonify({"flashcards": flashcards_data})
        return jsonify({"flashcards": fallback_flashcards})
    except Exception:
        return jsonify({"flashcards": fallback_flashcards})


@app.route("/generate-interview", methods=["POST"])
def generate_interview():
    data = request.json or {}
    subject = data.get("subject", "").strip()
    level = data.get("level", "Beginner").strip()
    main_subject, _ = get_subject_topics(subject)
    subject_lower = subject.lower()

    if "chem" in subject_lower:
        fallback_interview = chemistry_interview()
    elif "phy" in subject_lower or "physics" in subject_lower:
        fallback_interview = physics_interview()
    else:
        fallback_interview = [
            {"question": f"What are the basics of {main_subject}?", "answer": f"The basics of {main_subject} include core definitions, important concepts, and practical applications.", "tip": "Start with definition and give one example."},
            {"question": f"Why is {main_subject} important?", "answer": f"{main_subject} is important because it helps solve real-world problems and build strong understanding.", "tip": "Connect answer with projects or exams."},
            {"question": f"Explain one important concept in {main_subject}.", "answer": f"Choose one core topic from {main_subject}, define it, and explain it with an example.", "tip": "Use simple language."},
            {"question": f"How did you practice {main_subject}?", "answer": "I practiced by revising concepts, solving questions, and applying them in small tasks.", "tip": "Mention projects if possible."},
            {"question": f"What is your strongest topic in {main_subject}?", "answer": "Mention your strongest topic and explain why you are confident in it.", "tip": "Be honest and specific."},
        ]

    prompt = f"""
Create exactly 10 interview questions ONLY about this subject:
{main_subject}

User typed: {subject}
Level: {level}

STRICT RULES:
- Do not generate unrelated subject questions.
- If subject is Chemistry/chem, generate chemistry interview questions only.
- If subject is Physics/phy, generate physics interview questions only.
- Return ONLY valid JSON array.
- No markdown.

Format:
[
  {{
    "question": "Question text",
    "answer": "Short answer",
    "tip": "Interview tip"
  }}
]
"""

    try:
        model = get_available_model()
        if model:
            response = client.models.generate_content(model=model, contents=prompt)
            interview_data = extract_json(response.text)
            if interview_data:
                return jsonify({"interview": interview_data})
        return jsonify({"interview": fallback_interview})
    except Exception:
        return jsonify({"interview": fallback_interview})


@app.route("/analyze-resume", methods=["POST"])
def analyze_resume():
    target_role = request.form.get("targetRole", "")
    resume_text = request.form.get("resumeText", "")
    uploaded_file = request.files.get("resume")

    if uploaded_file:
        filename = uploaded_file.filename.lower()
        file_content = uploaded_file.read()
        if filename.endswith(".txt"):
            try:
                resume_text += "\n" + file_content.decode("utf-8", errors="ignore")
            except Exception:
                pass
        else:
            resume_text += f"\nUploaded file name: {uploaded_file.filename}\n"
            resume_text += "Note: For best analysis, paste resume text also. Direct PDF/DOCX text extraction is not enabled in this simple version."

    fallback_analysis = f"""
AI Resume Analysis

Target Role: {target_role}

ATS Score: 72/100

Strengths:
- Resume contains relevant learning/project experience.
- Good base for entry-level technical roles.
- Shows interest in technology and practical work.

Missing Skills / Improvements:
- Add measurable project outcomes.
- Add technical skills section clearly.
- Add GitHub, LinkedIn, and portfolio links.
- Use action verbs like Built, Developed, Designed, Implemented.
- Match keywords from the target job description.

Suggested Skills to Add:
- Python / JavaScript
- React / Flask
- Database basics
- API integration
- Git and GitHub

Project Improvement Suggestion:
Mention your AI Study Planner project with AI planner, quiz generator, notes generator, flashcards, analytics, and resume analyzer.
"""

    prompt = f"""
Analyze this resume for the target role.

Target Role: {target_role}

Resume Text:
{resume_text}

Return a clear report with:
- ATS score out of 100
- Strengths
- Weaknesses
- Missing skills
- Keywords to add
- Project improvement suggestions
- Better resume bullet points
- Final recommendation
"""

    try:
        model = get_available_model()
        if model:
            response = client.models.generate_content(model=model, contents=prompt)
            return jsonify({"analysis": response.text})
        return jsonify({"analysis": fallback_analysis})
    except Exception:
        return jsonify({"analysis": fallback_analysis})



@app.route("/ai-memory/<int:user_id>", methods=["GET"])
def get_ai_memory(user_id):
    memories = AIMemory.query.filter_by(user_id=user_id).order_by(AIMemory.updated_at.desc()).all()
    return jsonify({"success": True, "memories": [memory_to_dict(m) for m in memories]})


@app.route("/ai-memory/<int:user_id>", methods=["POST"])
def save_ai_memory(user_id):
    data = request.json or {}
    key = data.get("key", "custom memory")
    value = data.get("value", "")

    if not value.strip():
        return jsonify({"success": False, "message": "Memory value is required"}), 400

    set_user_memory(user_id, key, value)
    db.session.commit()

    memories = AIMemory.query.filter_by(user_id=user_id).order_by(AIMemory.updated_at.desc()).all()
    return jsonify({"success": True, "message": "Memory saved", "memories": [memory_to_dict(m) for m in memories]})


@app.route("/ai-memory/<int:user_id>", methods=["DELETE"])
def clear_ai_memory(user_id):
    AIMemory.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({"success": True, "message": "AI memory cleared"})


@app.route("/chat-sessions/<int:user_id>", methods=["GET"])
def get_chat_sessions(user_id):
    sessions = (
        ChatSession.query.filter_by(user_id=user_id)
        .order_by(ChatSession.updated_at.desc(), ChatSession.id.desc())
        .all()
    )
    return jsonify({"success": True, "sessions": [chat_session_to_dict(s) for s in sessions]})


@app.route("/chat-session", methods=["POST"])
def create_chat_session():
    data = request.json or {}
    user_id = data.get("userId")
    title = data.get("title", "New Chat").strip() or "New Chat"

    session = ChatSession(user_id=user_id, title=title)
    db.session.add(session)
    db.session.commit()

    return jsonify({"success": True, "session": chat_session_to_dict(session)})


@app.route("/chat-session/<int:session_id>", methods=["GET"])
def get_chat_session_messages(session_id):
    session = ChatSession.query.get(session_id)
    if not session:
        return jsonify({"success": False, "message": "Chat session not found"}), 404

    messages = ChatMessage.query.filter_by(session_id=session_id).order_by(ChatMessage.id.asc()).all()
    return jsonify({
        "success": True,
        "session": chat_session_to_dict(session),
        "messages": [chat_message_to_dict(m) for m in messages],
    })


@app.route("/chat-session/<int:session_id>", methods=["DELETE"])
def delete_chat_session(session_id):
    session = ChatSession.query.get(session_id)
    if not session:
        return jsonify({"success": False, "message": "Chat session not found"}), 404

    ChatMessage.query.filter_by(session_id=session_id).delete()
    db.session.delete(session)
    db.session.commit()
    return jsonify({"success": True, "message": "Chat deleted successfully"})


@app.route("/ai-chat", methods=["POST"])
def ai_chat():
    data = request.json or {}
    message = data.get("message", "").strip()
    user_name = data.get("userName", "Student").strip()
    user_id = data.get("userId")
    session_id = data.get("sessionId")

    if not message:
        return jsonify({"reply": "Please type a question."})

    session = None
    if session_id:
        session = ChatSession.query.get(session_id)

    if not session:
        session = ChatSession(user_id=user_id, title=make_chat_title(message))
        db.session.add(session)
        db.session.commit()

    user_msg = ChatMessage(session_id=session.id, sender="user", text=message)
    db.session.add(user_msg)
    db.session.commit()

    memory_updates = update_memory_from_message(user_id, message)
    memory_text = get_user_memory_text(user_id)

    previous_messages = (
        ChatMessage.query.filter_by(session_id=session.id)
        .order_by(ChatMessage.id.desc())
        .limit(8)
        .all()
    )
    previous_messages = list(reversed(previous_messages))
    history_text = "\n".join([f"{m.sender}: {m.text}" for m in previous_messages])

    fallback_reply = f"""
Hi {user_name},

Here is a simple answer for your question:

{message}

Study Tip:
- Understand the definition first.
- Learn the important points.
- Practice examples.
- Revise using short notes.
- Try answering 3-5 questions on this topic.
"""

    prompt = f"""
You are StudyAI, a helpful AI study assistant for college students.

Student name: {user_name}
Saved AI memory about this student:
{memory_text}

Conversation history:
{history_text}

Latest student question:
{message}

Answer rules:
- Give a clear and useful answer.
- Use saved AI memory when it is relevant.
- Keep context from the chat history.
- If the student says "give me questions" and memory has a current subject, use that subject.
- If the student asks for Chemistry, answer only Chemistry.
- If the student asks for DBMS, answer only DBMS.
- If the student asks for Python, answer only Python.
- If the student asks for interview preparation, give interview questions and short answers.
- If the student asks for notes, give exam-friendly notes.
- Use headings and bullet points when helpful.
- Keep the answer structured and easy to understand.
"""

    try:
        model = get_available_model()
        if model:
            response = client.models.generate_content(model=model, contents=prompt)
            reply = response.text
        else:
            reply = fallback_reply
    except Exception:
        reply = fallback_reply

    ai_msg = ChatMessage(session_id=session.id, sender="ai", text=reply)
    session.updated_at = datetime.now().strftime("%Y-%m-%d %H:%M")
    if session.title == "New Chat":
        session.title = make_chat_title(message)
    db.session.add(ai_msg)
    db.session.commit()

    memories = AIMemory.query.filter_by(user_id=user_id).order_by(AIMemory.updated_at.desc()).all() if user_id else []

    return jsonify({
        "reply": reply,
        "sessionId": session.id,
        "session": chat_session_to_dict(session),
        "memoryUpdates": memory_updates,
        "memories": [memory_to_dict(m) for m in memories],
    })


# ---------------- SAVED PLANS ----------------

@app.route("/save-plan", methods=["POST"])
def save_plan():
    data = request.json or {}
    new_plan = StudyPlan(
        subjects=data.get("subjects"),
        hours=data.get("hours"),
        weak_subjects=data.get("weakSubjects"),
        exam_date=data.get("examDate"),
        plan=data.get("plan"),
    )
    db.session.add(new_plan)
    db.session.commit()
    return jsonify({"message": "Study plan saved successfully"})


@app.route("/saved-plans", methods=["GET"])
def saved_plans():
    plans = StudyPlan.query.all()
    result = []
    for p in plans:
        result.append({
            "id": p.id,
            "subjects": p.subjects,
            "hours": p.hours,
            "weakSubjects": p.weak_subjects,
            "examDate": p.exam_date,
            "plan": p.plan,
        })
    return jsonify(result)


@app.route("/delete-plan/<int:plan_id>", methods=["DELETE"])
def delete_plan(plan_id):
    plan = StudyPlan.query.get(plan_id)
    if not plan:
        return jsonify({"message": "Plan not found"})
    db.session.delete(plan)
    db.session.commit()
    return jsonify({"message": "Plan deleted successfully"})


if __name__ == "__main__":
    app.run(debug=True)
