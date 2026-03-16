async function uploadtoipfs(file){
    console.log('in the upload one ',file)
    const address=import.meta.VITE_IPFS_ADDRESS || "localhost"
    const port=import.meta.VITE_IPFS_PORT || 8000
    const backend=`http://${address}:${port}/upload`
    try{

        const fromdata=new FormData()
        fromdata.append("file",file)
        const response=await fetch(backend,{
            method:"POST",
            body:fromdata
        })    
        const data=await response.json()
        return data
    }
    catch(err){
        console.error("Error uploading file:",err)
    }
}
export default uploadtoipfs