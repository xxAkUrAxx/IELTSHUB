import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./config";

const USERS_COLLECTION = "users";
const ALLOWED_ROLES = ["admin", "teacher", "student", "creator"];

function getUserDocRef(uid) {
  return doc(db, USERS_COLLECTION, uid);
}

async function createUserRole(uid, role) {
  if (!uid) {
    throw new Error("A user uid is required.");
  }

  if (!ALLOWED_ROLES.includes(role)) {
    throw new Error("Role must be one of: admin, teacher, student, creator.");
  }

  const userDocRef = getUserDocRef(uid);

  await setDoc(userDocRef, {
    uid,
    role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return userDocRef;
}

async function getUserRole(uid) {
  if (!uid) {
    throw new Error("A user uid is required.");
  }

  const userSnapshot = await getDoc(getUserDocRef(uid));

  if (!userSnapshot.exists()) {
    return null;
  }

  return userSnapshot.data();
}

export {
  ALLOWED_ROLES,
  USERS_COLLECTION,
  createUserRole,
  getUserDocRef,
  getUserRole,
};
