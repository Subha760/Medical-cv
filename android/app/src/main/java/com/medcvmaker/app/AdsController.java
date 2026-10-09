package com.medcvmaker.app;

import android.app.Activity;
import android.widget.LinearLayout;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.MobileAds;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;

/** Ads fail closed: real IDs, explicit release approval, eligible home route, then UMP consent. */
final class AdsController {
    private final Activity activity;
    private final LinearLayout root;
    private final ConsentInformation consent;
    private boolean home, requesting, initialized;
    private AdView banner;
    AdsController(Activity activity, LinearLayout root) {
        this.activity=activity; this.root=root;
        consent=UserMessagingPlatform.getConsentInformation(activity);
    }
    private boolean configured() {
        return BuildConfig.ADS_APPROVED && !BuildConfig.APP_ENTRY.startsWith("pulse/")
            && BuildConfig.ADMOB_APP_ID.matches("ca-app-pub-[0-9]{16}~[0-9]{10}")
            && BuildConfig.ADMOB_BANNER_ID.matches("ca-app-pub-[0-9]{16}/[0-9]{10}");
    }
    void setPlacement(String path, boolean referred) {
        home=("/".equals(path)||"".equals(path))&&!referred;
        if(!home||!configured()){if(banner!=null){root.removeView(banner);banner.destroy();banner=null;}return;}
        if(requesting)return;
        requesting=true;
        ConsentRequestParameters params=new ConsentRequestParameters.Builder().setTagForUnderAgeOfConsent(false).build();
        consent.requestConsentInfoUpdate(activity,params,()->UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity,error->{requesting=false;if(error==null&&consent.canRequestAds()&&home){if(!initialized){MobileAds.initialize(activity,status->{initialized=true;showBanner();});}else showBanner();}}),error->{requesting=false;});
    }
    private void showBanner(){
        if(!home||!configured()||!consent.canRequestAds()||banner!=null)return;
        banner=new AdView(activity);banner.setAdUnitId(BuildConfig.ADMOB_BANNER_ID);
        int width=(int)(activity.getResources().getDisplayMetrics().widthPixels/activity.getResources().getDisplayMetrics().density);
        banner.setAdSize(AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(activity,width));
        root.addView(banner,new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT,LinearLayout.LayoutParams.WRAP_CONTENT));
        banner.loadAd(new AdRequest.Builder().build());
    }
    void privacyChoices(){if(configured()&&consent.getPrivacyOptionsRequirementStatus()==ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED)UserMessagingPlatform.showPrivacyOptionsForm(activity,error->{});}
    void pause(){if(banner!=null)banner.pause();}
    void resume(){if(banner!=null)banner.resume();}
    void destroy(){if(banner!=null)banner.destroy();}
}
