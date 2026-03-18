// comments.js

const comments = {};

// Function to add a comment to a post
function addComment(postId, comment) {
    if (!comments[postId]) {
        comments[postId] = [];
    }
    comments[postId].push(comment);
}

// Function to retrieve comments for a post
function getComments(postId) {
    return comments[postId] || [];
}

// Function to delete a comment from a post
function deleteComment(postId, commentIndex) {
    if (comments[postId] && comments[postId][commentIndex]) {
        comments[postId].splice(commentIndex, 1);
    }
}

// Exporting the functions if using ES6 modules
export { addComment, getComments, deleteComment };