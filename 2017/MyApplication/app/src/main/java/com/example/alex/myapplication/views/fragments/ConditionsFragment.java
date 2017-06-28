package com.example.alex.myapplication.views.fragments;

import android.animation.ValueAnimator;
import android.os.Bundle;
import android.support.v4.app.Fragment;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.Animation;
import android.view.animation.Transformation;
import android.widget.ProgressBar;
import android.widget.TextView;

import com.example.alex.myapplication.R;
import com.example.alex.myapplication.communication.ServerCommunication;
import com.example.alex.myapplication.util.DataCallBack;

public class ConditionsFragment extends Fragment implements DataCallBack {

    public ConditionsFragment() {
    }

    private TextView temp1;
    private TextView temp2;

    private ProgressBar progressBar;

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        View rootView = inflater.inflate(R.layout.fragment_conditions, container, false);

        temp1 = (TextView)rootView.findViewById(R.id.label_temp_out);
        temp2 = (TextView)rootView.findViewById(R.id.label_temp_water);
        progressBar = (ProgressBar)rootView.findViewById(R.id.progressBar);

        progressBar.setProgress(70);
        return rootView;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        ServerCommunication.getInstance(getActivity()).subscribeToNewTemperature(getActivity(), this);
    }

    @Override
    public void onResume() {
        super.onResume();

        startCountAnimation();
        ProgressBarAnimation anim = new ProgressBarAnimation(progressBar, 15, 80);
        anim.setDuration(1000);
        progressBar.startAnimation(anim);
    }

    private void startCountAnimation() {
        ValueAnimator animator = ValueAnimator.ofInt(0, 26);
        animator.setDuration(870);
        animator.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
            public void onAnimationUpdate(ValueAnimator animation) {
                temp1.setText(animation.getAnimatedValue().toString() + "°");
                temp2.setText(animation.getAnimatedValue().toString() + "°");
            }
        });
        animator.start();
    }

    @Override
    public void onSuccess(Object result, String context) {
        if(context.equals("newTemp")) {
            String[] temps = (String[]) result.toString().split(",");
            temp1.setText(temps[0] += "°");
            temp2.setText(temps[1] += "°");
            ProgressBarAnimation anim = new ProgressBarAnimation(progressBar, 0, 80);
            anim.setDuration(1000);
            progressBar.startAnimation(anim);
        }
        else if(context.equals("newWaterLevel")) {
            ProgressBarAnimation anim = new ProgressBarAnimation(progressBar, 15, 80);
            anim.setDuration(1000);
            progressBar.startAnimation(anim);
        }
    }

    @Override
    public void onFailure() {

    }

    private class ProgressBarAnimation extends Animation {
        private ProgressBar progressBar;
        private float from;
        private float  to;

        public ProgressBarAnimation(ProgressBar progressBar, float from, float to) {
            super();
            this.progressBar = progressBar;
            this.from = from;
            this.to = to;
        }

        @Override
        protected void applyTransformation(float interpolatedTime, Transformation t) {
            super.applyTransformation(interpolatedTime, t);
            float value = from + (to - from) * interpolatedTime;
            progressBar.setProgress((int) value);
        }

    }
}
