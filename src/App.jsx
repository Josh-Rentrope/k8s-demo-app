import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  onSnapshot,
  deleteDoc,
  setDoc,
  query,
  setLogLevel
} from "firebase/firestore";

// --- START Firebase Configuration ---
// IMPORTANT: Replace this with your project's firebaseConfig object
// You can get this from the Firebase Console:
// Project Settings > General > Your apps > Web app > SDK setup and configuration
//
// You must ALSO replace the `appId` variable definition below.

// const firebaseConfig = JSON.parse(__firebase_config);
// const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// EXAMPLE REPLACEMENT:
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
const appId = firebaseConfig.projectId; // Use your project ID
// --- END Firebase Configuration ---

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// setLogLevel('debug'); // Uncomment for detailed Firestore logs

function App() {
  const [userId, setUserId] = useState(null);
  const [calculations, setCalculations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [name, setName] = useState("");
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  
  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  // Effect for Authentication
  useEffect(() => {
    const signIn = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Error signing in:", error);
      }
    };
    signIn();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Effect for Firestore data
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // Path for data, private to the current user
    const collectionPath = `/artifacts/${appId}/users/${userId}/calculations`;
    const q = query(collection(db, collectionPath));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCalculations(docs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching data:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]); // Re-run if userId changes

  const handleAddCalculation = async (e) => {
    e.preventDefault();
    if (!userId || !name) return;

    const result = parseFloat(num1) + parseFloat(num2);
    const collectionPath = `/artifacts/${appId}/users/${userId}/calculations`;
    
    try {
      await addDoc(collection(db, collectionPath), {
        name: name,
        num1: num1,
        num2: num2,
        result: result,
        createdAt: new Date().toISOString()
      });
      // Clear form
      setName("");
      setNum1(0);
      setNum2(0);
    } catch (error) {
      console.error("Error adding document: ", error);
    }
  };

  const handleDelete = async (id) => {
    if (!userId) return;
    const docPath = `/artifacts/${appId}/users/${userId}/calculations/${id}`;
    try {
      await deleteDoc(doc(db, docPath));
    } catch (error) {
      console.error("Error deleting document: ", error);
    }
  };

  const startEdit = (calc) => {
    setEditingId(calc.id);
    setEditingName(calc.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleUpdateName = async (id) => {
    if (!userId) return;
    const docPath = `/artifacts/${appId}/users/${userId}/calculations/${id}`;
    try {
      // Use setDoc with merge:true to update only the 'name' field
      await setDoc(doc(db, docPath), { name: editingName }, { merge: true });
      cancelEdit();
    } catch (error) {
      console.error("Error updating document: ", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-cyan-400 mb-2">K8s Pod State Demo</h1>
          <p className="text-lg text-gray-400">
            This app uses React Hooks and Firestore to persist data.
            Your data is saved even if the Kubernetes pod is killed and recreated.
          </p>
          {userId && (
            <p className="text-sm text-gray-500 mt-2 bg-gray-800 p-2 rounded">
              Your User ID: {userId}
            </p>
          )}
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 text-white">Add a Calculation</h2>
            <form onSubmit={handleAddCalculation} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300">Name</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="e.g., My first calculation"
                />
              </div>
              <div>
                <label htmlFor="num1" className="block text-sm font-medium text-gray-300">Number 1</label>
                <input
                  type="number"
                  id="num1"
                  value={num1}
                  onChange={(e) => setNum1(e.target.value)}
                  className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              <div>
                <label htmlFor="num2" className="block text-sm font-medium text-gray-300">Number 2</label>
                <input
                  type="number"
                  id="num2"
                  value={num2}
                  onChange={(e) => setNum2(e.target.value)}
                  className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50"
              >
                Add & Save to Firestore
              </button>
            </form>
          </div>

          {/* Data Section */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 text-white">Persistent Data</h2>
            {loading && <p className="text-gray-400">Loading data from Firestore...</p>}
            {!loading && !userId && <p className="text-yellow-400">Authenticating...</p>}
            {!loading && userId && calculations.length === 0 && (
              <p className="text-gray-400">No data saved yet. Add a calculation to see it appear here.</p>
            )}
            <ul className="space-y-4">
              {calculations.map((calc) => (
                <li key={calc.id} className="bg-gray-700 p-4 rounded-md shadow-sm">
                  {editingId === calc.id ? (
                    // Edit Mode
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="block w-full bg-gray-600 border border-gray-500 rounded-md shadow-sm p-2 text-white focus:ring-cyan-500 focus:border-cyan-500"
                      />
                      <p className="text-lg text-gray-300">
                        {calc.num1} + {calc.num2} = <span className="font-bold text-cyan-400">{calc.result}</span>
                      </p>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleUpdateName(calc.id)}
                          className="text-sm bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded-md transition duration-200"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-sm bg-gray-500 hover:bg-gray-600 text-white py-1 px-3 rounded-md transition duration-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div>
                      <h3 className="text-xl font-semibold text-cyan-300">{calc.name}</h3>
                      <p className="text-lg text-gray-300">
                        {calc.num1} + {calc.num2} = <span className="font-bold text-cyan-400">{calc.result}</span>
                      </E>
                      <div className="flex space-x-2 mt-3">
                        <button
                          onClick={() => startEdit(calc)}
                          className="text-sm bg-yellow-600 hover:bg-yellow-700 text-white py-1 px-3 rounded-md transition duration-200"
                        >
                          Edit Name
                        </button>
                        <button
                          onClick={() => handleDelete(calc.id)}
                          className="text-sm bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded-md transition duration-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
