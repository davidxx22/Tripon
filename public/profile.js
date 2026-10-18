export const PROFILE_KEY='tripon.profile.v1';
export function validateProfile(raw){
  if(!raw||raw.version!==1||typeof raw.name!=='string'||!raw.name.trim()||raw.name.trim().length>60)throw new Error('Enter a display name with 1–60 characters.');
  if(typeof raw.photo!=='string'||raw.photo.length>300000||(raw.photo&&!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(raw.photo)))throw new Error('Choose a valid JPG, PNG, or WebP photo.');
  return {version:1,name:raw.name.trim(),photo:raw.photo};
}
export function profileInitials(name){return name.trim().split(/\s+/).slice(0,2).map(x=>[...x][0]||'').join('').toLocaleUpperCase();}
export async function prepareProfilePhoto(file){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024)throw new Error('Choose a JPG, PNG, or WebP image up to 8 MB.');
  const url=URL.createObjectURL(file);
  try{
    const image=new Image();image.src=url;await image.decode();
    if(!image.naturalWidth||!image.naturalHeight)throw new Error('Invalid image.');
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,256,256);const size=Math.min(image.naturalWidth,image.naturalHeight);
    ctx.drawImage(image,(image.naturalWidth-size)/2,(image.naturalHeight-size)/2,size,size,0,0,256,256);
    return canvas.toDataURL('image/jpeg',.85);
  }catch{throw new Error('That photo could not be read. Try another JPG, PNG, or WebP image.');}
  finally{URL.revokeObjectURL(url);}
}
