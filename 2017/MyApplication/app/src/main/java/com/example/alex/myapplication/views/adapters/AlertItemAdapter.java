package com.example.alex.myapplication.views.adapters;

import android.support.v7.widget.CardView;
import android.support.v7.widget.RecyclerView;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import com.example.alex.myapplication.R;
import com.example.alex.myapplication.models.Alert;
import com.example.alex.myapplication.models.Biot;

import java.util.List;


public class AlertItemAdapter extends RecyclerView.Adapter<AlertItemAdapter.ViewHolder> {

    private List<Biot> alerts;

    public AlertItemAdapter(List<Biot> alerts) {
        this.alerts = alerts;
    }

    public static class ViewHolder extends RecyclerView.ViewHolder {
        public TextView textView;
        public CardView cardView;
        public ViewHolder(View item) {
            super(item);
            cardView = (CardView)item.findViewById(R.id.card_view1);
            textView = (TextView)item.findViewById(R.id.label_alert_item);
        }
    }

    @Override
    public AlertItemAdapter.ViewHolder onCreateViewHolder(ViewGroup parent,
                                                          int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.alert_item, parent, false);
        ViewHolder viewHolder = new ViewHolder(v);
        return viewHolder;
    }

    @Override
    public void onBindViewHolder(ViewHolder holder, int position) {
        Alert alert = (Alert)alerts.get(position);
        holder.textView.setText(alert.getMessage());
    }

    @Override
    public int getItemCount() {
        return alerts.size();
    }

    @Override
    public void onAttachedToRecyclerView(RecyclerView recyclerView) {
        super.onAttachedToRecyclerView(recyclerView);
    }
}