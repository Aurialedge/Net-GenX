import {userStore} from "./store" 
import {OtpStore} from "./otp.store"
export default function Testing(){
    const {user}=userStore()
    const {number}=OtpStore()
    return(
        <div>
            <h1>Testing</h1>
            <p>{user.name}</p>
            <p>{user.email}</p>
            <p>{user._id}</p>
            <p>{number}</p>
        </div>
    )
}
