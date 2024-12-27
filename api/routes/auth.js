import express from 'express'
import {
        changeCurrentPassword, 
        getCurrentUser, 
        getUserChannelProfile, 
        getWatchHistory, 
        loginUser, 
        logoutUser, 
        refreshAccessToken, 
        registerUser, 
        updateAccountDetails, 
        updateUserAvatar, 
        updateUserCoverImage
    } from '../controllers/auth.js'
import {upload} from "../middleware/multer.js";
import { verifyJWT } from '../middleware/auth.middleware.js';


const router = express.Router();


router.post('/login', loginUser);

router.post('/register', 
    upload.fields([
        {
            name: "avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser
);

//secured routes
router.post('/logout',verifyJWT, logoutUser);
router.post('/refresh-token', refreshAccessToken);
router.post('/change-password', verifyJWT, changeCurrentPassword);
router.get('/current-user', verifyJWT, getCurrentUser);
router.patch('/update-account', verifyJWT, updateAccountDetails);

router.patch('/update-avatar',
            verifyJWT,   
            upload.single("avatar"), 
            updateUserAvatar
            );
router.patch('/update-coverImage', 
            verifyJWT,
            upload.single("coverImage"),
            updateUserCoverImage
            );


router.get('/c/:username', verifyJWT, getUserChannelProfile);
router.get('/history', verifyJWT, getWatchHistory);

export default router;