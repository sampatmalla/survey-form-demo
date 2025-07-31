// surveyData.js
export const surveyData = {
    "survey_id": "s12345",
    "survey_title": "Survey Form",
    "survey_description": "Telstra 2025 2 Feb. Reporting",
    "Sections": {
        "Introduction": {
            "section_id": "Introduction",
            "section_title": "Introduction",
            "section_description": "Basic information about you",
            "questions": {
                "Q1": {
                    "question_id": "Q1",
                    "question": "What is your age?",
                    "default_route": "Introduction/Q2",
                    "type": "Number",
                    "properties": {
                        "step": 1,
                        "upper_limit": 100,
                        "lower_limit": 14,
                        "data_type": "int",
                        "route_evaluation_conditions": [
                            {
                                "config_id": 1,
                                "main_value": "50",
                                "function": "is_greater_than",
                                "route": "Introduction/Q4"
                            },
                            {
                                "config_id": 2,
                                "main_value": "25",
                                "function": "is_lesser_than",
                                "route": "Introduction/Q3"
                            },
                            {
                                "config_id": 3,
                                "main_value": "15, 20",
                                "function": "in_range_exclusive",
                                "route": "Introduction/Q5"
                            }
                        ]
                    }
                },
                "Q2": {
                    "question_id": "Q2",
                    "question": "How did you hear about our services?",
                    "default_route": "Introduction/Q3",
                    "type": "MCQ (Single Choice)",
                    "properties": {
                        "options": {
                            "a": "Social Media",
                            "b": "Friend or Family",
                            "c": "Advertisement",
                            "d": "Search Engine",
                            "e": "Other"
                        },
                        "route_evaluation_conditions": [
                            {
                                "config_id": 1,
                                "main_value": "",
                                "function": "ifSelected",
                                "option_id": "a",
                                "route": "Introduction/Q3"
                            },
                            {
                                "config_id": 2,
                                "main_value": "",
                                "function": "ifSelected",
                                "option_id": "b",
                                "route": "Introduction/Q6"
                            }
                        ]
                    }
                },
                "Q3": {
                    "question_id": "Q3",
                    "question": "Which social media platforms do you use? (Select all that apply)",
                    "default_route": "Introduction/Q6",
                    "type": "MCQ (Multiple Choice)",
                    "properties": {
                        "options": {
                            "a": "Facebook",
                            "b": "Instagram",
                            "c": "Twitter/X",
                            "d": "LinkedIn",
                            "e": "TikTok",
                            "f": "Other"
                        },
                        "route_evaluation_conditions": [
                            {
                                "config_id": 1,
                                "function": "ifSelectedMultiple",
                                "option_ids": ["a", "b"],
                                "route": "Introduction/Q7"
                            },
                            {
                                "config_id": 2,
                                "function": "ifSelectedMultiple",
                                "option_ids": ["c", "d", "e"],
                                "route": "Introduction/Q6"
                            }
                        ]
                    }
                },
                "Q4": {
                    "question_id": "Q4",
                    "question": "When did you first use our product?",
                    "default_route": "Introduction/Q7",
                    "type": "Date",
                    "properties": {
                        "min_date": "2020-01-01",
                        "max_date": "2025-04-13",
                        "route_evaluation_conditions": [
                            {
                                "config_id": 1,
                                "main_value": "2023-01-01",
                                "function": "is_after",
                                "route": "Introduction/Q6"
                            },
                            {
                                "config_id": 2,
                                "main_value": "2022-01-01",
                                "function": "is_before",
                                "route": "Introduction/Q5"
                            }
                        ]
                    }
                },
                "Q5": {
                    "question_id": "Q5",
                    "question": "What is your email address?",
                    "default_route": "Introduction/Q7",
                    "type": "Small Answer",
                    "properties": {
                        "max_length": 100,
                        "min_length": 5,
                        "validation_type": "email",
                        "route_evaluation_conditions": []
                    }
                },
                "Q6": {
                    "question_id": "Q6",
                    "question": "What is your occupation?",
                    "default_route": "Introduction/Q7",
                    "type": "Small Answer",
                    "properties": {
                        "max_length": 100,
                        "min_length": 2,
                        "route_evaluation_conditions": []
                    }
                },
                "Q7": {
                    "question_id": "Q7",
                    "question": "How often do you use online services?",
                    "default_route": "Experience/Q1",
                    "type": "MCQ (Single Choice)",
                    "properties": {
                        "options": {
                            "a": "Daily",
                            "b": "Several times a week",
                            "c": "Weekly",
                            "d": "Monthly",
                            "e": "Rarely"
                        },
                        "route_evaluation_conditions": []
                    }
                }
            }
        },
        "Experience": {
            "section_id": "Experience",
            "section_title": "Your Experience",
            "section_description": "Tell us about your experience with our product",
            "questions": {
                "Q1": {
                    "question_id": "Q1",
                    "question": "How would you rate your overall experience?",
                    "default_route": "Experience/Q2",
                    "type": "MCQ (Single Choice)",
                    "properties": {
                        "options": {
                            "a": "Excellent",
                            "b": "Good",
                            "c": "Average",
                            "d": "Below Average",
                            "e": "Poor"
                        },
                        "route_evaluation_conditions": [
                            {
                                "config_id": 1,
                                "main_value": "",
                                "function": "ifSelected",
                                "option_id": "a",
                                "route": "Experience/Q2"
                            },
                            {
                                "config_id": 2,
                                "main_value": "",
                                "function": "ifSelected",
                                "option_id": "e",
                                "route": "Experience/Q4"
                            }
                        ]
                    }
                },
                "Q2": {
                    "question_id": "Q2",
                    "question": "Which features do you use most often? (Select up to 3)",
                    "default_route": "Experience/Q3",
                    "type": "MCQ (Multiple Choice)",
                    "properties": {
                        "options": {
                            "a": "Dashboard Analytics",
                            "b": "Report Generation",
                            "c": "Mobile App",
                            "d": "Customer Support",
                            "e": "Integration Tools",
                            "f": "Other"
                        },
                        "max_selections": 3,
                        "route_evaluation_conditions": [
                            {
                                "config_id": 1,
                                "function": "ifSelectedMultiple",
                                "option_ids": ["a", "b"],
                                "route": "Experience/Q3"
                            },
                            {
                                "config_id": 2,
                                "function": "ifSelectedMultiple",
                                "option_ids": ["c", "d"],
                                "route": "Experience/Q5"
                            }
                        ]
                    }
                },
                "Q3": {
                    "question_id": "Q3",
                    "question": "On a scale of 0-10, how likely are you to recommend our product to others?",
                    "default_route": "Experience/Q4",
                    "type": "Number",
                    "properties": {
                        "step": 1,
                        "upper_limit": 10,
                        "lower_limit": 0,
                        "data_type": "int",
                        "route_evaluation_conditions": [
                            {
                                "config_id": 1,
                                "main_value": "8",
                                "function": "is_greater_than_equal",
                                "route": "Experience/Q4"
                            },
                            {
                                "config_id": 2,
                                "main_value": "3",
                                "function": "is_lesser_than_equal",
                                "route": "Experience/Q6"
                            },
                            {
                                "config_id": 3,
                                "main_value": "4, 7",
                                "function": "in_range_inclusive",
                                "route": "Experience/Q7"
                            }
                        ]
                    }
                },
                "Q4": {
                    "question_id": "Q4",
                    "question": "What do you like most about our product?",
                    "default_route": "Experience/Q7",
                    "type": "Large Answer",
                    "properties": {
                        "max_length": 500,
                        "min_length": 10,
                        "route_evaluation_conditions": [
                            {
                                "config_id": 1,
                                "keywords": ["easy", "simple", "intuitive", "user-friendly"],
                                "function": "keywords",
                                "route": "Experience/Q5"
                            },
                            {
                                "config_id": 2,
                                "keywords": ["support", "customer service", "help"],
                                "function": "keywords",
                                "route": "Experience/Q6"
                            }
                        ]
                    }
                },
                "Q5": {
                    "question_id": "Q5",
                    "question": "How often do you encounter technical issues with our product?",
                    "default_route": "Experience/Q6",
                    "type": "MCQ (Single Choice)",
                    "properties": {
                        "options": {
                            "a": "Never",
                            "b": "Rarely",
                            "c": "Sometimes",
                            "d": "Often",
                            "e": "Very Often"
                        },
                        "route_evaluation_conditions": []
                    }
                },
                "Q6": {
                    "question_id": "Q6",
                    "question": "How long have you been using our product?",
                    "default_route": "Experience/Q7",
                    "type": "MCQ (Single Choice)",
                    "properties": {
                        "options": {
                            "a": "Less than a month",
                            "b": "1-6 months",
                            "c": "6-12 months",
                            "d": "1-2 years",
                            "e": "More than 2 years"
                        },
                        "route_evaluation_conditions": []
                    }
                },
                "Q7": {
                    "question_id": "Q7",
                    "question": "How would you rate the value for money of our product?",
                    "default_route": "Feedback/Q1",
                    "type": "Rating",
                    "properties": {
                        "max_rating": 5,
                        "min_rating": 1,
                        "rating_symbols": "star",
                        "route_evaluation_conditions": []
                    }
                }
            }
        },
        "Feedback": {
            "section_id": "Feedback",
            "section_title": "Feedback & Suggestions",
            "section_description": "Help us improve our product",
            "questions": {
                "Q1": {
                    "question_id": "Q1",
                    "question": "What features would you like to see added to our product?",
                    "default_route": "Feedback/Q2",
                    "type": "Large Answer",
                    "properties": {
                        "max_length": 1000,
                        "min_length": 20,
                        "route_evaluation_conditions": [
                            {
                                "config_id": 1,
                                "keywords": ["mobile", "app", "smartphone", "tablet"],
                                "function": "keywords",
                                "route": "Feedback/Q3"
                            },
                            {
                                "config_id": 2,
                                "keywords": ["integration", "connect", "api", "third-party"],
                                "function": "keywords",
                                "route": "Feedback/Q4"
                            }
                        ]
                    }
                },
                "Q2": {
                    "question_id": "Q2",
                    "question": "Which areas need the most improvement? (Select all that apply)",
                    "default_route": "Feedback/Q3",
                    "type": "MCQ (Multiple Choice)",
                    "properties": {
                        "options": {
                            "a": "User Interface",
                            "b": "Performance/Speed",
                            "c": "Feature Set",
                            "d": "Customer Support",
                            "e": "Documentation",
                            "f": "Pricing"
                        },
                        "route_evaluation_conditions": [
                            {
                                "config_id": 1,
                                "function": "ifSelectedMultiple",
                                "option_ids": ["a", "c"],
                                "route": "Feedback/Q3"
                            },
                            {
                                "config_id": 2,
                                "function": "ifSelectedMultiple",
                                "option_ids": ["b", "e"],
                                "route": "Feedback/Q5"
                            }
                        ]
                    }
                },
                "Q3": {
                    "question_id": "Q3",
                    "question": "Would you participate in a follow-up interview?",
                    "default_route": "Feedback/Q5",
                    "type": "MCQ (Single Choice)",
                    "properties": {
                        "options": {
                            "a": "Yes",
                            "b": "No"
                        },
                        "route_evaluation_conditions": [
                            {
                                "config_id": 1,
                                "main_value": "",
                                "function": "ifSelected",
                                "option_id": "a",
                                "route": "Feedback/Q4"
                            },
                            {
                                "config_id": 2,
                                "main_value": "",
                                "function": "ifSelected",
                                "option_id": "b",
                                "route": "Feedback/Q6"
                            }
                        ]
                    }
                },
                "Q4": {
                    "question_id": "Q4",
                    "question": "Please provide a screenshot of any issues you've encountered",
                    "default_route": "Feedback/Q6",
                    "type": "File Upload",
                    "properties": {
                        "max_file_size_in_mb": 5,
                        "allowed_file_types": ["image/png", "image/jpeg", "image/jpg"],
                        "route_evaluation_conditions": [
                            {
                                "config_id": 1,
                                "function": "isUploaded",
                                "route": "Feedback/Q5"
                            },
                            {
                                "config_id": 2,
                                "function": "isNotUploaded",
                                "route": "Feedback/Q6"
                            }
                        ]
                    }
                },
                "Q5": {
                    "question_id": "Q5",
                    "question": "When is the best time to contact you for a follow-up?",
                    "default_route": "Feedback/Q6",
                    "type": "Timestamp",
                    "properties": {
                        "min_time": "09:00",
                        "max_time": "18:00",
                        "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                        "route_evaluation_conditions": []
                    }
                },
                "Q6": {
                    "question_id": "Q6",
                    "question": "How satisfied are you with our customer support?",
                    "default_route": "Feedback/Q7",
                    "type": "Rating",
                    "properties": {
                        "max_rating": 5,
                        "min_rating": 1,
                        "rating_symbols": "star",
                        "route_evaluation_conditions": []
                    }
                },
                "Q7": {
                    "question_id": "Q7",
                    "question": "What aspect of our product has been most valuable to you?",
                    "default_route": "Final/Q1",
                    "type": "Small Answer",
                    "properties": {
                        "max_length": 200,
                        "min_length": 5,
                        "route_evaluation_conditions": []
                    }
                }
            }
        },
        "Final": {
            "section_id": "Final",
            "section_title": "Thank You",
            "section_description": "We appreciate your feedback",
            "questions": {
                "Q1": {
                    "question_id": "Q1",
                    "question": "Any final comments you'd like to share?",
                    "default_route": "Final/Q2",
                    "type": "Large Answer",
                    "properties": {
                        "max_length": 1000,
                        "min_length": 0,
                        "route_evaluation_conditions": [
                            {
                                "config_id": 1,
                                "keywords": ["thank", "appreciate", "helpful"],
                                "function": "keywords",
                                "route": "Final/Q3"
                            },
                            {
                                "config_id": 2,
                                "keywords": ["improve", "better", "suggestion"],
                                "function": "keywords",
                                "route": "Final/Q4"
                            }
                        ]
                    }
                },
                "Q2": {
                    "question_id": "Q2",
                    "question": "Would you like to receive our newsletter?",
                    "default_route": "Final/Q3",
                    "type": "MCQ (Single Choice)",
                    "properties": {
                        "options": {
                            "a": "Yes",
                            "b": "No"
                        },
                        "route_evaluation_conditions": [
                            {
                                "config_id": 1,
                                "main_value": "",
                                "function": "ifSelected",
                                "option_id": "a",
                                "route": "Final/Q5"
                            },
                            {
                                "config_id": 2,
                                "main_value": "",
                                "function": "ifSelected",
                                "option_id": "b",
                                "route": "Final/Q3"
                            }
                        ]
                    }
                },
                "Q3": {
                    "question_id": "Q3",
                    "question": "How likely are you to participate in future surveys?",
                    "default_route": "Final/Q6",
                    "type": "Rating",
                    "properties": {
                        "max_rating": 5,
                        "min_rating": 1,
                        "rating_symbols": "star",
                        "route_evaluation_conditions": [
                            {
                                "config_id": 1,
                                "main_value": "4",
                                "function": "is_greater_than_equal",
                                "route": "Final/Q4"
                            },
                            {
                                "config_id": 2,
                                "main_value": "2",
                                "function": "is_lesser_than_equal",
                                "route": "Final/Q7"
                            }
                        ]
                    }
                },
                "Q4": {
                    "question_id": "Q4",
                    "question": "What industry are you in?",
                    "default_route": "Final/Q6",
                    "type": "Dropdown",
                    "properties": {
                        "options": {
                            "a": "Technology",
                            "b": "Finance",
                            "c": "Healthcare",
                            "d": "Education",
                            "e": "Retail",
                            "f": "Manufacturing",
                            "g": "Other"
                        },
                        "route_evaluation_conditions": []
                    }
                },
                "Q5": {
                    "question_id": "Q5",
                    "question": "How did you find our survey?",
                    "default_route": "Final/Q6",
                    "type": "MCQ (Single Choice)",
                    "properties": {
                        "options": {
                            "a": "Email invitation",
                            "b": "Social media",
                            "c": "Website popup",
                            "d": "After customer service interaction",
                            "e": "Other"
                        },
                        "route_evaluation_conditions": []
                    }
                },
                "Q6": {
                    "question_id": "Q6",
                    "question": "Would you be interested in early access to new features?",
                    "default_route": "Final/Q7",
                    "type": "MCQ (Single Choice)",
                    "properties": {
                        "options": {
                            "a": "Yes",
                            "b": "No",
                            "c": "Maybe"
                        },
                        "route_evaluation_conditions": [
                            {
                                "config_id": 1,
                                "main_value": "",
                                "function": "ifSelected",
                                "option_id": "a",
                                "route": "Final/Q7"
                            },
                            {
                                "config_id": 2,
                                "main_value": "",
                                "function": "ifSelected",
                                "option_id": "b",
                                "route": "Final/Q8"
                            }
                        ]
                    }
                },
                "Q7": {
                    "question_id": "Q7",
                    "question": "What is your preferred method of communication for product updates?",
                    "default_route": "Final/Q8",
                    "type": "MCQ (Single Choice)",
                    "properties": {
                        "options": {
                            "a": "Email",
                            "b": "In-app notifications",
                            "c": "SMS",
                            "d": "Social media",
                            "e": "None"
                        },
                        "route_evaluation_conditions": []
                    }
                },
                "Q8": {
                    "question_id": "Q8",
                    "question": "Thank you for your time! Click submit to complete the survey.",
                    "default_route": "End",
                    "type": "Information",
                    "properties": {
                        "route_evaluation_conditions": []
                    }
                }
            }
        }
    },
    "survey_settings": {
        "allow_back_navigation": true,
        "show_progress_bar": true,
        "show_section_titles": true,
        "randomize_questions": false,
        "required_questions": ["Introduction/Q1", "Introduction/Q2", "Experience/Q1", "Experience/Q3", "Feedback/Q3"],
        "completion_message": "Thank you for completing our survey! Your feedback is valuable to us.",
        "theme": {
            "primary_color": "#4A90E2",
            "secondary_color": "#F5A623",
            "font_family": "Roboto, sans-serif",
            "background_color": "#F6F7FA",
            "text_color": "#333333"
        }
    }
};

// Helper functions
export const getSectionById = (id) => {
    return surveyData.Sections[id];
};

export const getQuestionById = (sectionId, questionId) => {
    const section = getSectionById(sectionId);
    return section ? section.questions[questionId] : null;
};