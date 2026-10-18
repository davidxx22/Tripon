export async function setTheme(page,dark){
 const previous=await page.locator('body').getAttribute('data-page')||'home';
 await page.locator('.bottom-nav [data-nav=settings]').click();
 await page.locator('#theme').setChecked(dark);
 await page.locator('.bottom-nav [data-nav='+previous+']').click();
}
