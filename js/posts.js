// posts.js

import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { db } from './firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

const postsRef = collection(db, 'posts'); // Firestore collection
const storage = getStorage(); // Firebase Storage

// Function to create a new post
export const createPost = async (postContent, imageFile) => {
    try {
        // Create post document
        const postDoc = await addDoc(postsRef, {
            content: postContent,
            createdAt: new Date()
        });

        // Upload image to Firebase Storage if provided
        if (imageFile) {
            const imageRef = ref(storage, `images/${postDoc.id}`);
            await uploadBytes(imageRef, imageFile);
        }

        console.log('Post created with ID: ', postDoc.id);
        return postDoc.id;
    } catch (error) {
        console.error('Error creating post: ', error);
        throw error;
    }
};

// Function to retrieve all posts
export const getPosts = async () => {
    try {
        const snapshot = await getDocs(postsRef);
        const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return posts;
    } catch (error) {
        console.error('Error getting posts: ', error);
        throw error;
    }
};

// Function to delete a post
export const deletePost = async (postId) => {
    try {
        await deleteDoc(doc(postsRef, postId));
        console.log('Post deleted with ID: ', postId);
    } catch (error) {
        console.error('Error deleting post: ', error);
        throw error;
    }
};
