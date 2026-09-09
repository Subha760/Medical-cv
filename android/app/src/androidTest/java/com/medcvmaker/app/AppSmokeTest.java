package com.medcvmaker.app;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.rule.ActivityTestRule;
import android.webkit.WebView;
import android.view.ViewGroup;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class AppSmokeTest {
    @Rule public ActivityTestRule<MainActivity> rule=new ActivityTestRule<>(MainActivity.class);
    private String js(String script) throws Exception {
        CountDownLatch latch=new CountDownLatch(1);
        AtomicReference<String> result=new AtomicReference<>();
        rule.getActivity().runOnUiThread(()-> {
            WebView web=(WebView)((ViewGroup)rule.getActivity().findViewById(android.R.id.content)).getChildAt(0);
            web.evaluateJavascript(script,value->{result.set(value);latch.countDown();});
        });
        assertTrue(latch.await(10,TimeUnit.SECONDS));return result.get();
    }
    private void waitFor(String expression) throws Exception {
        for(int i=0;i<40;i++){if("true".equals(js(expression))) return;Thread.sleep(500);}
        fail("WebView condition failed: "+expression+"; page="+js("document.body.innerText"));
    }
    @Test public void offlineAssetsTemplatesAndEditorLoad() throws Exception {
        waitFor("document.body.innerText.includes('Create my CV')");
        assertEquals("true",js("window.isSecureContext"));
        assertEquals("true",js("!!window.MedCVAndroid"));
        js("location.hash='/new'");
        waitFor("document.querySelectorAll('.template-card').length>0");
        waitFor("document.querySelectorAll('canvas').length>0");
        js("document.querySelector('.template-card').click()");
        waitFor("!!document.querySelector('.template-confirm__action')");
        js("document.querySelector('.template-confirm__action').click()");
        waitFor("document.body.innerText.includes('Personal Details')");
        assertEquals("true",js("document.body.innerText.includes('Photo shape')"));
        assertEquals("true",js("document.documentElement.scrollWidth<=window.innerWidth+1"));
    }
}
