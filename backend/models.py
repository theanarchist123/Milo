from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True) # Firebase UID
    email = Column(String, unique=True, index=True)
    google_access_token = Column(String, nullable=True)
    google_refresh_token = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    emails = relationship("EmailRecord", back_populates="owner")
    courses = relationship("Course", back_populates="owner")
    tasks = relationship("Task", back_populates="owner")
    outputs = relationship("GeneratedOutput", back_populates="owner")

class EmailRecord(Base):
    __tablename__ = "emails"
    id = Column(String, primary_key=True, index=True) # Gmail Message ID
    owner_id = Column(String, ForeignKey("users.id"))
    subject = Column(String)
    sender = Column(String)
    date = Column(DateTime)
    body_text = Column(Text)
    status = Column(String, default="pending")
    classification = Column(JSON, nullable=True) # Dict with type, priority, etc.

    owner = relationship("User", back_populates="emails")

class Course(Base):
    __tablename__ = "courses"
    id = Column(String, primary_key=True, index=True) # Classroom Course ID
    owner_id = Column(String, ForeignKey("users.id"))
    name = Column(String)
    teacher = Column(String)
    section = Column(String)
    subject = Column(String)

    owner = relationship("User", back_populates="courses")
    items = relationship("CourseItem", back_populates="course")

class CourseItem(Base):
    __tablename__ = "course_items"
    id = Column(String, primary_key=True, index=True) # Coursework ID
    course_id = Column(String, ForeignKey("courses.id"))
    title = Column(String)
    type = Column(String)
    description = Column(Text)
    due_date = Column(DateTime, nullable=True)
    status = Column(String, default="pending")

    course = relationship("Course", back_populates="items")

class Task(Base):
    __tablename__ = "tasks"
    id = Column(String, primary_key=True, index=True) # Generated Task ID
    owner_id = Column(String, ForeignKey("users.id"))
    source_id = Column(String, index=True) # Maps to Email or CourseItem
    source_type = Column(String) # 'gmail' or 'classroom'
    source_subject = Column(String)
    status = Column(String)
    current_step = Column(String)
    started_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="tasks")
    output = relationship("GeneratedOutput", back_populates="task", uselist=False)

class GeneratedOutput(Base):
    __tablename__ = "generated_outputs"
    id = Column(String, primary_key=True, index=True)
    owner_id = Column(String, ForeignKey("users.id"))
    task_id = Column(String, ForeignKey("tasks.id"))
    type = Column(String) # 'ASSIGNMENT', 'SUMMARY', etc.
    title = Column(String)
    preview_text = Column(Text)
    file_path = Column(String) # Path inside backend/media/
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="outputs")
    task = relationship("Task", back_populates="output")
