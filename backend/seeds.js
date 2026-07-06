import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Club from './models/Club.js';
import Event from './models/Event.js';
import User from './models/User.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/student-clubs-events';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB connected');

    // Clear existing data
    await Club.deleteMany({});
    await Event.deleteMany({});
    console.log('🗑️  Cleared existing clubs and events');

    // Get or create admin user
    let adminUser = await User.findOne({ email: 'admin@example.com' });
    if (!adminUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      adminUser = await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin'
      });
      console.log('👤 Created admin user');
    }

    // Sample Clubs Data
    const clubsData = [
      {
        clubName: 'Tech Club',
        description: 'A club for technology enthusiasts, coding, web development, and AI/ML discussions.',
        admin: adminUser._id
      },
      {
        clubName: 'Coding Wizards',
        description: 'Learn programming languages including Python, JavaScript, C++, and Java.',
        admin: adminUser._id
      },
      {
        clubName: 'Design Club',
        description: 'Explore UI/UX design, graphic design, and digital art.',
        admin: adminUser._id
      },
      {
        clubName: 'Data Science Club',
        description: 'Machine learning, data analysis, statistics, and big data technologies.',
        admin: adminUser._id
      },
      {
        clubName: 'Mobile App Developers',
        description: 'Development of iOS and Android applications using React Native and Flutter.',
        admin: adminUser._id
      },
      {
        clubName: 'Web Development Club',
        description: 'Full-stack web development including frontend, backend, and databases.',
        admin: adminUser._id
      },
      {
        clubName: 'Cloud Computing Club',
        description: 'AWS, Google Cloud, Azure, and serverless architecture.',
        admin: adminUser._id
      },
      {
        clubName: 'Cybersecurity Club',
        description: 'Network security, cryptography, penetration testing, and ethical hacking.',
        admin: adminUser._id
      },
      {
        clubName: 'Gaming Dev Club',
        description: 'Game development using Unity, Unreal Engine, and Godot.',
        admin: adminUser._id
      },
      {
        clubName: 'AI & Machine Learning',
        description: 'Artificial intelligence, neural networks, deep learning, and NLP.',
        admin: adminUser._id
      }
    ];

    // Create clubs
    const clubs = await Club.create(clubsData);
    console.log(`✅ Created ${clubs.length} clubs`);

    // Sample Events Data
    const eventsData = [
      {
        title: 'Web Development Workshop',
        description: 'Learn modern web development with React, Node.js, and MongoDB. Build a full-stack application from scratch.',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        location: 'Main Auditorium',
        club: clubs[1]._id,
        capacity: 50,
        status: 'upcoming'
      },
      {
        title: 'Python Bootcamp',
        description: 'Intensive Python programming course covering basics to advanced concepts.',
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        location: 'Computer Lab A',
        club: clubs[1]._id,
        capacity: 40,
        status: 'upcoming'
      },
      {
        title: 'UI/UX Design Masterclass',
        description: 'Learn design principles, wireframing, prototyping, and user research.',
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        location: 'Design Studio',
        club: clubs[2]._id,
        capacity: 35,
        status: 'upcoming'
      },
      {
        title: 'Machine Learning Fundamentals',
        description: 'Introduction to ML algorithms, supervised learning, and neural networks.',
        date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        location: 'Science Building Room 301',
        club: clubs[3]._id,
        capacity: 45,
        status: 'upcoming'
      },
      {
        title: 'React.js Deep Dive',
        description: 'Advanced React concepts including hooks, context API, and state management.',
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        location: 'Tech Hub Room 2',
        club: clubs[0]._id,
        capacity: 60,
        status: 'upcoming'
      },
      {
        title: 'Mobile App Development with React Native',
        description: 'Build cross-platform mobile applications using React Native.',
        date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
        location: 'Innovation Center',
        club: clubs[4]._id,
        capacity: 40,
        status: 'upcoming'
      },
      {
        title: 'AWS Cloud Architecture',
        description: 'Design scalable cloud solutions using AWS services and best practices.',
        date: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
        location: 'Cloud Lab',
        club: clubs[6]._id,
        capacity: 50,
        status: 'upcoming'
      },
      {
        title: 'Cybersecurity Essentials',
        description: 'Network security, firewalls, encryption, and secure coding practices.',
        date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        location: 'Security Center',
        club: clubs[7]._id,
        capacity: 45,
        status: 'upcoming'
      },
      {
        title: 'Game Development with Unity',
        description: 'Create 3D games using Unity engine and C# programming.',
        date: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000),
        location: 'Game Dev Studio',
        club: clubs[8]._id,
        capacity: 35,
        status: 'upcoming'
      },
      {
        title: 'Deep Learning & Neural Networks',
        description: 'Advanced deep learning techniques including CNNs, RNNs, and transformers.',
        date: new Date(Date.now() + 49 * 24 * 60 * 60 * 1000),
        location: 'AI Lab',
        club: clubs[9]._id,
        capacity: 40,
        status: 'upcoming'
      },
      {
        title: 'Database Design & SQL',
        description: 'Master relational databases, SQL queries, and database optimization.',
        date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
        location: 'Data Center Room 5',
        club: clubs[5]._id,
        capacity: 55,
        status: 'upcoming'
      },
      {
        title: 'Graphic Design Fundamentals',
        description: 'Color theory, typography, composition, and design tools (Adobe Creative Suite).',
        date: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
        location: 'Design Studio B',
        club: clubs[2]._id,
        capacity: 30,
        status: 'upcoming'
      },
      {
        title: 'Data Analysis with Python & Pandas',
        description: 'Analyze large datasets using Python, Pandas, and data visualization libraries.',
        date: new Date(Date.now() + 24 * 24 * 60 * 60 * 1000),
        location: 'Analytics Lab',
        club: clubs[3]._id,
        capacity: 50,
        status: 'upcoming'
      },
      {
        title: 'JavaScript Advanced Topics',
        description: 'Closures, async/await, promises, event loop, and functional programming.',
        date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        location: 'Programming Lab',
        club: clubs[1]._id,
        capacity: 55,
        status: 'upcoming'
      },
      {
        title: 'DevOps & Docker',
        description: 'Containerization with Docker, Kubernetes, and CI/CD pipelines.',
        date: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000),
        location: 'DevOps Center',
        club: clubs[6]._id,
        capacity: 45,
        status: 'upcoming'
      },
      {
        title: 'Ethical Hacking Workshop',
        description: 'Penetration testing, vulnerability assessment, and security auditing.',
        date: new Date(Date.now() + 38 * 24 * 60 * 60 * 1000),
        location: 'Security Lab',
        club: clubs[7]._id,
        capacity: 35,
        status: 'upcoming'
      },
      {
        title: 'Unreal Engine Game Development',
        description: 'Create high-quality 3D games using Unreal Engine and C++.',
        date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        location: 'Game Studio',
        club: clubs[8]._id,
        capacity: 30,
        status: 'upcoming'
      },
      {
        title: 'NLP & Text Processing',
        description: 'Natural Language Processing, text mining, and sentiment analysis.',
        date: new Date(Date.now() + 52 * 24 * 60 * 60 * 1000),
        location: 'AI Lab Room 2',
        club: clubs[9]._id,
        capacity: 40,
        status: 'upcoming'
      },
      {
        title: 'Tech Meetup & Networking',
        description: 'Meet industry professionals, share ideas, and build connections.',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        location: 'Main Hall',
        club: clubs[0]._id,
        capacity: 100,
        status: 'upcoming'
      },
      {
        title: 'Startup Ideas Pitching',
        description: 'Share your startup ideas and get feedback from mentors and investors.',
        date: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
        location: 'Innovation Center',
        club: clubs[0]._id,
        capacity: 80,
        status: 'upcoming'
      }
    ];

    // Create events
    const events = await Event.create(eventsData);
    console.log(`✅ Created ${events.length} events`);

    console.log('\n✨ Database seeded successfully!');
    console.log(`📊 Total Clubs: ${clubs.length}`);
    console.log(`📅 Total Events: ${events.length}`);
    console.log('\n🎓 You can now:');
    console.log('1. Sign up as a new student');
    console.log('2. Login with admin@example.com / admin123');
    console.log('3. Browse clubs and events');
    console.log('4. Join clubs and register for events');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  }
};

seedDatabase();
