// ============================================================================
// 👤 FIREBASE CLOUD REAL-TIME PROFILE SYNC MANAGER
// ============================================================================

import React, { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';

export default function ProfileManager({ appId = 'vedic-astro-live', auth, db, onUserChanged, onProfilesSynced }) {

  useEffect(() => {
    if (!auth) {
      console.warn('ProfileManager: Firebase auth instance was not provided. Cloud sync is disabled.');
      return undefined;
    }

    let unsubscribeSnapshot = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (onUserChanged) onUserChanged(currentUser);

      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (!currentUser || !db || !appId) return;

      const profilesRef = collection(db, 'artifacts', appId, 'users', currentUser.uid, 'profiles');
      console.log("🌌 Firebase Sync Activated: Attaching real-time profile listeners...");

      unsubscribeSnapshot = onSnapshot(profilesRef,
        (snapshot) => {
          const loadedProfiles = [];
          snapshot.forEach((doc) => {
            loadedProfiles.push({ id: doc.id, ...doc.data() });
          });
          if (loadedProfiles.length > 0 && onProfilesSynced) {
            console.log(`✅ Cloud synced ${loadedProfiles.length} family profiles successfully!`);
            onProfilesSynced(loadedProfiles);
          }
        },
        (error) => {
          console.error("❌ Firestore Sync Error:", error);
        }
      );
    });

    return () => {
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      unsubscribeAuth();
    };
  }, [auth, db, appId, onUserChanged, onProfilesSynced]);

  return null; // This component operates strictly as a background data pipeline
}
